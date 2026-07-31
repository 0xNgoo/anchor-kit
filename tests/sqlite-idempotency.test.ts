import Database from 'bun:sqlite';

describe('sqlite idempotency persistence', () => {
  it('stores and fetches an idempotency record by scope and key', () => {
    const db = new Database(':memory:');

    db.run(
      `CREATE TABLE IF NOT EXISTS idempotency (
        scope TEXT NOT NULL,
        id_key TEXT NOT NULL,
        hash TEXT NOT NULL,
        status INTEGER NOT NULL,
        response TEXT NOT NULL,
        PRIMARY KEY(scope, id_key)
      )`,
    );

    const scope = 'sep24:deposit';
    const key = 'client-123';
    const hash = 'abcd1234';
    const status = 200;
    const response = { message: 'ok', id: 'resp-1' };

    db.run(
      'INSERT INTO idempotency (scope, id_key, hash, status, response) VALUES (?, ?, ?, ?, ?)',
      [scope, key, hash, status, JSON.stringify(response)],
    );

    const all = [...db.query('SELECT scope, id_key, hash, status, response FROM idempotency')];
    expect(all.length).toBe(1);

    const inserted = all[0] as {
      scope: string;
      id_key: string;
      hash: string;
      status: number;
      response: string;
    };

    expect(inserted.scope).toBe(scope);
    expect(inserted.id_key).toBe(key);
    expect(inserted.hash).toBe(hash);
    expect(inserted.status).toBe(status);
    expect(JSON.parse(inserted.response)).toEqual(response);

    const rows = [
      ...db.query(
        `SELECT scope, id_key, hash, status, response FROM idempotency WHERE scope = '${scope}' AND id_key = '${key}'`,
      ),
    ];

    expect(rows.length).toBe(1);

    const fetched = rows[0] as {
      scope: string;
      id_key: string;
      hash: string;
      status: number;
      response: string;
    };

    expect(fetched.scope).toBe(scope);
    expect(fetched.id_key).toBe(key);
    expect(fetched.hash).toBe(hash);
    expect(fetched.status).toBe(status);
    expect(JSON.parse(fetched.response)).toEqual(response);
  });

  it('isolates idempotency records by scope when the same key is used', () => {
    const db = new Database(':memory:');

    db.run(
      `CREATE TABLE IF NOT EXISTS idempotency (
        scope TEXT NOT NULL,
        id_key TEXT NOT NULL,
        hash TEXT NOT NULL,
        status INTEGER NOT NULL,
        response TEXT NOT NULL,
        PRIMARY KEY(scope, id_key)
      )`,
    );

    const key = 'shared-client-key';
    const scopeA = 'sep24:deposit';
    const scopeB = 'sep31:receive';

    const responseA = { message: 'deposit success', id: 'resp-A' };
    const responseB = { message: 'receive success', id: 'resp-B' };

    // Insert Record A
    db.run(
      'INSERT INTO idempotency (scope, id_key, hash, status, response) VALUES (?, ?, ?, ?, ?)',
      [scopeA, key, 'hashA', 200, JSON.stringify(responseA)],
    );

    // Insert Record B
    db.run(
      'INSERT INTO idempotency (scope, id_key, hash, status, response) VALUES (?, ?, ?, ?, ?)',
      [scopeB, key, 'hashB', 201, JSON.stringify(responseB)],
    );

    // Assert both canonical records are inserted
    const all = [...db.query('SELECT scope, id_key, hash, status, response FROM idempotency')];
    expect(all.length).toBe(2);

    // Lookup Scope A and assert correct record
    const rowsA = [
      ...db.query(
        `SELECT response FROM idempotency WHERE scope = '${scopeA}' AND id_key = '${key}'`
      ),
    ];
    expect(rowsA.length).toBe(1);
    expect(JSON.parse((rowsA[0] as any).response)).toEqual(responseA);

    // Lookup Scope B and assert correct record
    const rowsB = [
      ...db.query(
        `SELECT response FROM idempotency WHERE scope = '${scopeB}' AND id_key = '${key}'`
      ),
    ];
    expect(rowsB.length).toBe(1);
    expect(JSON.parse((rowsB[0] as any).response)).toEqual(responseB);
  });
});
