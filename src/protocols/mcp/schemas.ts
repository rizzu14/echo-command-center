// ─── MCP Protocol Schemas ─────────────────────────────────────────────────────
// Model Context Protocol — JSON-RPC 2.0 based

export type MCPMethod = 'context/submit' | 'context/ack' | 'context/error';

// JSON-RPC 2.0 base types
export interface JsonRpcRequest<T = unknown> {
  jsonrpc: '2.0';
  id: string | number;
  method: MCPMethod;
  params: T;
}

export interface JsonRpcResponse<T = unknown> {
  jsonrpc: '2.0';
  id: string | number;
  result?: T;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

// MCP error codes
export const MCPErrorCode = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  SCHEMA_VALIDATION_FAILED: -32001,
  PAYLOAD_TOO_LARGE: -32002,
} as const;

// context/submit params
export interface ContextSubmitParams {
  session_id: string;
  tenant_id: string;
  context_tokens: number;       // number of tokens in the context
  content: string | StreamRef;  // raw content or stream reference
  compressed?: boolean;
  streaming?: boolean;
  metadata?: Record<string, unknown>;
}

// Reference to a chunked stream
export interface StreamRef {
  stream_id: string;
  total_chunks: number;
  total_bytes: number;
}

// A single stream chunk
export interface StreamChunk {
  stream_id: string;
  sequence: number;
  total_chunks: number;
  data: string;           // base64-encoded chunk data
  checksum: string;       // CRC32 hex of this chunk's raw bytes
}

// context/submit result
export interface ContextSubmitResult {
  session_id: string;
  accepted: boolean;
  compressed: boolean;
  streaming: boolean;
  bytes_received: number;
}

// Full MCP context/submit request
export type MCPContextSubmitRequest = JsonRpcRequest<ContextSubmitParams>;
export type MCPContextSubmitResponse = JsonRpcResponse<ContextSubmitResult>;

// Validation helpers
export function isJsonRpcRequest(obj: unknown): obj is JsonRpcRequest {
  if (typeof obj !== 'object' || obj === null) return false;
  const r = obj as Record<string, unknown>;
  return (
    r['jsonrpc'] === '2.0' &&
    (typeof r['id'] === 'string' || typeof r['id'] === 'number') &&
    typeof r['method'] === 'string' &&
    typeof r['params'] === 'object' &&
    r['params'] !== null
  );
}

export function isContextSubmitParams(obj: unknown): obj is ContextSubmitParams {
  if (typeof obj !== 'object' || obj === null) return false;
  const p = obj as Record<string, unknown>;
  return (
    typeof p['session_id'] === 'string' &&
    typeof p['tenant_id'] === 'string' &&
    typeof p['context_tokens'] === 'number' &&
    (typeof p['content'] === 'string' || isStreamRef(p['content']))
  );
}

function isStreamRef(obj: unknown): obj is StreamRef {
  if (typeof obj !== 'object' || obj === null) return false;
  const s = obj as Record<string, unknown>;
  return (
    typeof s['stream_id'] === 'string' &&
    typeof s['total_chunks'] === 'number' &&
    typeof s['total_bytes'] === 'number'
  );
}

export const SUPPORTED_METHODS: MCPMethod[] = ['context/submit', 'context/ack', 'context/error'];
