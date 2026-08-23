import { Pool, QueryResult, QueryResultRow } from 'pg';
import fs from 'fs';
import path from 'path';

export interface DatabaseDriver {
  query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<{ rows: T[] }>;
  init(): Promise<void>;
  close(): Promise<void>;
}

/**
 * PostgreSQL Implementation using 'pg' Pool
 */
export class PostgresDriver implements DatabaseDriver {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
        ? false
        : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
    });

    this.pool.on('error', (err) => {
      console.error('[PostgresDriver] Unexpected pool error:', err.message);
    });
  }

  async init(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS guilds (
          guild_id VARCHAR(64) PRIMARY KEY,
          notification_channel_id VARCHAR(64),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS subscriptions (
          id SERIAL PRIMARY KEY,
          guild_id VARCHAR(64) NOT NULL,
          source VARCHAR(32) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(guild_id, source)
        );

        CREATE INDEX IF NOT EXISTS idx_subscriptions_source ON subscriptions(source);
        CREATE INDEX IF NOT EXISTS idx_subscriptions_guild_id ON subscriptions(guild_id);

        CREATE TABLE IF NOT EXISTS last_notices (
          source VARCHAR(32) PRIMARY KEY,
          notice_id VARCHAR(128) NOT NULL,
          checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('[PostgresDriver] Database schema initialized successfully.');
    } finally {
      client.release();
    }
  }

  async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<{ rows: T[] }> {
    const res: QueryResult<T> = await this.pool.query(text, params);
    return { rows: res.rows };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

/**
 * Embedded / JSON-fallback Driver
 * Used for zero-config local prototyping, testing, or environments without PostgreSQL
 */
export class EmbeddedDriver implements DatabaseDriver {
  private filePath: string;
  private data: {
    guilds: Record<string, { guild_id: string; notification_channel_id?: string; created_at: string; updated_at: string }>;
    subscriptions: Array<{ guild_id: string; source: string; created_at: string }>;
    last_notices: Record<string, { source: string; notice_id: string; checked_at: string }>;
  };

  constructor(filePath?: string) {
    this.filePath = filePath || path.join(process.cwd(), '.tu_bot_data.json');
    this.data = {
      guilds: {},
      subscriptions: [],
      last_notices: {},
    };
  }

  async init(): Promise<void> {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.data = JSON.parse(raw);
      }
    } catch {
      console.warn('[EmbeddedDriver] Could not load persisted store, initializing fresh.');
    }
    console.log('[EmbeddedDriver] Embedded database ready.');
  }

  private persist(): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('[EmbeddedDriver] Failed to persist data:', e);
    }
  }

  async query<T extends QueryResultRow = any>(text: string, params: any[] = []): Promise<{ rows: T[] }> {
    // guilds queries
    if (text.includes('SELECT * FROM guilds WHERE guild_id')) {
      const g = this.data.guilds[params[0]];
      return { rows: g ? ([g] as unknown as T[]) : [] };
    }

    if (text.includes('SELECT * FROM guilds') && !text.includes('WHERE')) {
      return { rows: Object.values(this.data.guilds) as unknown as T[] };
    }

    if (text.includes('INSERT INTO guilds') || text.includes('ON CONFLICT (guild_id)')) {
      const [guild_id, notification_channel_id] = params;
      const now = new Date().toISOString();
      const existing = this.data.guilds[guild_id];
      this.data.guilds[guild_id] = {
        guild_id,
        notification_channel_id,
        created_at: existing?.created_at || now,
        updated_at: now,
      };
      this.persist();
      return { rows: [this.data.guilds[guild_id]] as unknown as T[] };
    }

    if (text.includes('DELETE FROM guilds WHERE guild_id')) {
      delete this.data.guilds[params[0]];
      this.data.subscriptions = this.data.subscriptions.filter(s => s.guild_id !== params[0]);
      this.persist();
      return { rows: [] };
    }

    // subscriptions queries
    if (text.includes('SELECT source FROM subscriptions WHERE guild_id')) {
      const sources = this.data.subscriptions
        .filter((s) => s.guild_id === params[0])
        .map((s) => ({ source: s.source }));
      return { rows: sources as unknown as T[] };
    }

    if (text.includes('SELECT DISTINCT source FROM subscriptions')) {
      const unique = Array.from(new Set(this.data.subscriptions.map((s) => s.source))).map((source) => ({ source }));
      return { rows: unique as unknown as T[] };
    }

    if (text.includes('SELECT guild_id FROM subscriptions WHERE source')) {
      const guilds = this.data.subscriptions
        .filter((s) => s.source === params[0])
        .map((s) => ({ guild_id: s.guild_id }));
      return { rows: guilds as unknown as T[] };
    }

    if (text.includes('INSERT INTO subscriptions')) {
      const [guild_id, source] = params;
      const exists = this.data.subscriptions.some((s) => s.guild_id === guild_id && s.source === source);
      if (!exists) {
        this.data.subscriptions.push({
          guild_id,
          source,
          created_at: new Date().toISOString(),
        });
        this.persist();
      }
      return { rows: [] };
    }

    if (text.includes('DELETE FROM subscriptions WHERE guild_id = $1 AND source = $2')) {
      const [guild_id, source] = params;
      const initialLen = this.data.subscriptions.length;
      this.data.subscriptions = this.data.subscriptions.filter((s) => !(s.guild_id === guild_id && s.source === source));
      this.persist();
      const count = initialLen - this.data.subscriptions.length;
      return { rows: [{ count }] as unknown as T[] };
    }

    if (text.includes('DELETE FROM subscriptions WHERE guild_id = $1')) {
      const [guild_id] = params;
      const initialLen = this.data.subscriptions.length;
      this.data.subscriptions = this.data.subscriptions.filter((s) => s.guild_id !== guild_id);
      this.persist();
      const count = initialLen - this.data.subscriptions.length;
      return { rows: [{ count }] as unknown as T[] };
    }

    // last_notices queries
    if (text.includes('SELECT * FROM last_notices WHERE source')) {
      const item = this.data.last_notices[params[0]];
      return { rows: item ? ([item] as unknown as T[]) : [] };
    }

    if (text.includes('SELECT * FROM last_notices')) {
      return { rows: Object.values(this.data.last_notices) as unknown as T[] };
    }

    if (text.includes('INSERT INTO last_notices') || text.includes('ON CONFLICT (source)')) {
      const [source, notice_id] = params;
      this.data.last_notices[source] = {
        source,
        notice_id,
        checked_at: new Date().toISOString(),
      };
      this.persist();
      return { rows: [this.data.last_notices[source]] as unknown as T[] };
    }

    return { rows: [] };
  }

  async close(): Promise<void> {
    this.persist();
  }
}

let dbInstance: DatabaseDriver | null = null;

export async function getDatabase(): Promise<DatabaseDriver> {
  if (dbInstance) return dbInstance;

  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://'))) {
    console.log('[Database] Connecting to PostgreSQL at DATABASE_URL...');
    dbInstance = new PostgresDriver(dbUrl);
  } else {
    console.log('[Database] Using Embedded JSON Driver for persistence...');
    dbInstance = new EmbeddedDriver();
  }

  try {
    await dbInstance.init();
  } catch (err: any) {
    console.error('[Database] Failed initializing primary database driver, falling back to embedded driver:', err.message);
    dbInstance = new EmbeddedDriver();
    await dbInstance.init();
  }

  return dbInstance;
}
