import cassandra from "cassandra-driver";
import fs from "fs";
import path from "path";

export interface CassandraConfig {
  contactPoints: string[];
  localDataCenter: string;
  keyspace?: string;
  username?: string;
  password?: string;
  /** Path to CA cert for TLS (optional). */
  sslCaPath?: string;
}

function buildConfig(cfg: CassandraConfig): cassandra.ClientOptions {
  const options: cassandra.ClientOptions = {
    contactPoints: cfg.contactPoints,
    localDataCenter: cfg.localDataCenter,
    keyspace: cfg.keyspace,
    policies: {
      retry: new cassandra.policies.retry.RetryPolicy(),
      reconnection: new cassandra.policies.reconnection.ExponentialReconnectionPolicy(
        1000,
        30000
      ),
    },
    socketOptions: { connectTimeout: 10000 },
  };

  if (cfg.username && cfg.password) {
    options.credentials = { username: cfg.username, password: cfg.password };
  }

  if (cfg.sslCaPath) {
    options.sslOptions = {
      ca: [fs.readFileSync(cfg.sslCaPath)],
      rejectUnauthorized: true,
    };
  }

  return options;
}

/** Singleton Cassandra client for the Liquid Ledger. */
let _client: cassandra.Client | null = null;

export function getClient(cfg?: CassandraConfig): cassandra.Client {
  if (_client) return _client;

  const config: CassandraConfig = cfg ?? {
    contactPoints: (process.env.CASSANDRA_CONTACT_POINTS ?? "localhost:9042").split(","),
    localDataCenter: process.env.CASSANDRA_DC ?? "datacenter1",
    keyspace: process.env.CASSANDRA_KEYSPACE ?? "echo_liquid_ledger",
    username: process.env.CASSANDRA_USERNAME,
    password: process.env.CASSANDRA_PASSWORD,
    sslCaPath: process.env.CASSANDRA_SSL_CA_PATH,
  };

  _client = new cassandra.Client(buildConfig(config));
  return _client;
}

/** Initialise keyspace and schema from .cql files, then connect. */
export async function initKeyspace(cfg?: CassandraConfig): Promise<cassandra.Client> {
  // Connect without a keyspace first so we can CREATE KEYSPACE
  const bootstrapCfg: CassandraConfig = {
    ...(cfg ?? {
      contactPoints: (process.env.CASSANDRA_CONTACT_POINTS ?? "localhost:9042").split(","),
      localDataCenter: process.env.CASSANDRA_DC ?? "datacenter1",
      username: process.env.CASSANDRA_USERNAME,
      password: process.env.CASSANDRA_PASSWORD,
    }),
    keyspace: undefined,
  };

  const bootstrap = new cassandra.Client(buildConfig(bootstrapCfg));
  await bootstrap.connect();

  const cqlDir = path.join(__dirname);
  for (const file of ["keyspace.cql", "schema.cql", "cold-tier.cql"]) {
    const cql = fs.readFileSync(path.join(cqlDir, file), "utf8");
    // Execute each non-empty, non-comment statement individually
    const statements = cql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    for (const stmt of statements) {
      await bootstrap.execute(stmt);
    }
  }

  await bootstrap.shutdown();

  // Now connect with the keyspace
  const client = getClient(cfg);
  await client.connect();
  return client;
}

export async function shutdownClient(): Promise<void> {
  if (_client) {
    await _client.shutdown();
    _client = null;
  }
}
