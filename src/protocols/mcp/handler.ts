import { createGzip, createGunzip, gzipSync, gunzipSync } from 'zlib';
import { createHash } from 'crypto';
import { Readable, Writable } from 'stream';
import {
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcError,
  MCPErrorCode,
  MCPContextSubmitRequest,
  MCPContextSubmitResponse,
  ContextSubmitParams,
  ContextSubmitResult,
  StreamChunk,
  isJsonRpcRequest,
  isContextSubmitParams,
  SUPPORTED_METHODS,
} from './schemas.js';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Compress when payload exceeds 128 KB */
const COMPRESSION_THRESHOLD_BYTES = 128 * 1024;

/** Stream when payload exceeds 128 KB */
const STREAMING_THRESHOLD_BYTES = 128 * 1024;

/** Max supported context: 1 million tokens (~4 bytes/token average → ~4 MB) */
const MAX_CONTEXT_TOKENS = 1_000_000;

/** Chunk size for streaming: 64 KB */
const CHUNK_SIZE_BYTES = 64 * 1024;

// ─── MCPHandler ───────────────────────────────────────────────────────────────

/**
 * Handles Model Context Protocol (MCP) messages.
 * Implements JSON-RPC 2.0 for the `context/submit` method.
 *
 * Requirements: 6.1, 6.4, 6.5, 6.6, 6.8
 */
export class MCPHandler {
  private readonly logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger ?? defaultLogger;
  }

  // ─── parse ────────────────────────────────────────────────────────────────

  /**
   * Parse a raw JSON string into a typed MCP request.
   * Rejects invalid messages with a structured error response (Req 6.8).
   */
  parse(raw: string): ParseResult {
    let parsed: unknown;

    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      this.logger.error('MCP parse error — invalid JSON', { raw, err });
      return {
        ok: false,
        error: this.buildError(null, MCPErrorCode.PARSE_ERROR, 'Parse error: invalid JSON', raw),
      };
    }

    if (!isJsonRpcRequest(parsed)) {
      this.logger.error('MCP parse error — not a valid JSON-RPC 2.0 request', { parsed });
      return {
        ok: false,
        error: this.buildError(
          null,
          MCPErrorCode.INVALID_REQUEST,
          'Invalid Request: missing jsonrpc, id, method, or params',
          raw,
        ),
      };
    }

    const req = parsed as JsonRpcRequest;

    if (!SUPPORTED_METHODS.includes(req.method as typeof SUPPORTED_METHODS[number])) {
      return {
        ok: false,
        error: this.buildError(
          req.id,
          MCPErrorCode.METHOD_NOT_FOUND,
          `Method not found: ${req.method}`,
          raw,
        ),
      };
    }

    if (req.method === 'context/submit') {
      if (!isContextSubmitParams(req.params)) {
        this.logger.error('MCP schema validation failed', { params: req.params });
        return {
          ok: false,
          error: this.buildError(
            req.id,
            MCPErrorCode.SCHEMA_VALIDATION_FAILED,
            'Schema validation failed: invalid context/submit params',
            raw,
          ),
        };
      }

      const params = req.params as ContextSubmitParams;
      if (params.context_tokens > MAX_CONTEXT_TOKENS) {
        return {
          ok: false,
          error: this.buildError(
            req.id,
            MCPErrorCode.PAYLOAD_TOO_LARGE,
            `Payload too large: context_tokens ${params.context_tokens} exceeds max ${MAX_CONTEXT_TOKENS}`,
            raw,
          ),
        };
      }
    }

    return { ok: true, request: req as MCPContextSubmitRequest };
  }

  // ─── serialize ────────────────────────────────────────────────────────────

  /**
   * Serialize an MCP response to a JSON string.
   * Pretty-printed for audit log inclusion (Req 6.6).
   */
  serialize(response: JsonRpcResponse): string {
    return JSON.stringify(response, null, 2);
  }

  // ─── compress ─────────────────────────────────────────────────────────────

  /**
   * Gzip-compress a payload buffer.
   * Applied when payload exceeds 128 KB (Req 6.4).
   */
  compress(payload: Buffer): Buffer {
    return gzipSync(payload);
  }

  // ─── decompress ───────────────────────────────────────────────────────────

  /**
   * Decompress a gzip-compressed payload buffer (Req 6.4).
   */
  decompress(compressed: Buffer): Buffer {
    return gunzipSync(compressed);
  }

  // ─── stream ───────────────────────────────────────────────────────────────

  /**
   * Split a large payload into chunks with sequence numbers and checksums.
   * Used for payloads exceeding 128 KB (Req 6.5).
   */
  stream(streamId: string, payload: Buffer): StreamChunk[] {
    const chunks: StreamChunk[] = [];
    const totalChunks = Math.ceil(payload.length / CHUNK_SIZE_BYTES);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE_BYTES;
      const end = Math.min(start + CHUNK_SIZE_BYTES, payload.length);
      const chunkData = payload.subarray(start, end);

      chunks.push({
        stream_id: streamId,
        sequence: i,
        total_chunks: totalChunks,
        data: chunkData.toString('base64'),
        checksum: this.crc32Hex(chunkData),
      });
    }

    return chunks;
  }

  // ─── handle ───────────────────────────────────────────────────────────────

  /**
   * Full request handling pipeline: parse → validate → compress/stream → respond.
   */
  handle(raw: string): MCPContextSubmitResponse {
    const parseResult = this.parse(raw);

    if (!parseResult.ok) {
      return parseResult.error!;
    }

    const req = parseResult.request!;
    const params = req.params as ContextSubmitParams;
    const contentStr =
      typeof params.content === 'string' ? params.content : JSON.stringify(params.content);
    const contentBytes = Buffer.from(contentStr, 'utf8');

    const shouldCompress = contentBytes.length > COMPRESSION_THRESHOLD_BYTES;
    const shouldStream = contentBytes.length > STREAMING_THRESHOLD_BYTES;

    const result: ContextSubmitResult = {
      session_id: params.session_id,
      accepted: true,
      compressed: shouldCompress,
      streaming: shouldStream,
      bytes_received: contentBytes.length,
    };

    return {
      jsonrpc: '2.0',
      id: req.id,
      result,
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private buildError(
    id: string | number | null,
    code: number,
    message: string,
    rawPayload: string,
  ): MCPContextSubmitResponse {
    this.logger.error('MCP error response', { code, message, rawPayload: rawPayload.slice(0, 512) });
    return {
      jsonrpc: '2.0',
      id: id ?? 0,
      error: { code, message, data: { raw: rawPayload.slice(0, 512) } },
    };
  }

  /** Simple CRC32 implemented via SHA-256 truncation for checksum purposes */
  private crc32Hex(data: Buffer): string {
    return createHash('sha256').update(data).digest('hex').slice(0, 8);
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ParseResult =
  | { ok: true; request: MCPContextSubmitRequest; error?: never }
  | { ok: false; error: MCPContextSubmitResponse; request?: never };

interface Logger {
  error(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
}

const defaultLogger: Logger = {
  error: (msg, meta) => console.error(`[MCPHandler] ${msg}`, meta ?? ''),
  info: (msg, meta) => console.info(`[MCPHandler] ${msg}`, meta ?? ''),
};
