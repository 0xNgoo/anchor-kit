/**
 * Vitest shim for bun:sqlite — wraps better-sqlite3 to match the
 * bun:sqlite API surface used in this project:
 *
 *   new Database(path)
 *   db.exec(sql)            — available natively in better-sqlite3
 *   db.run(sql, params)     — mapped to prepare().run()
 *   db.query(sql)           — mapped to prepare().all(), returns an array
 *   db.prepare(sql)         — available natively in better-sqlite3
 *   db.close()              — available natively in better-sqlite3
 */
import BetterSqlite3, { type Statement } from 'better-sqlite3';

type Row = Record<string, unknown>;

class BunSqliteDatabase {
  private db: InstanceType<typeof BetterSqlite3>;

  constructor(path: string) {
    this.db = new BetterSqlite3(path);
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  run(sql: string, params?: unknown[]): void {
    if (params && params.length > 0) {
      this.db.prepare(sql).run(...params);
    } else {
      this.db.prepare(sql).run();
    }
  }

  /** bun:sqlite db.query() returns an iterable of rows — we return an array */
  query(sql: string, params?: unknown[]): Row[] {
    const stmt = this.db.prepare(sql);
    return params && params.length > 0 ? (stmt.all(...params) as Row[]) : (stmt.all() as Row[]);
  }

  prepare(sql: string): Statement {
    return this.db.prepare(sql);
  }

  close(): void {
    this.db.close();
  }
}

export { BunSqliteDatabase as Database };
export default BunSqliteDatabase;
