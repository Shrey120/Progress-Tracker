// Runs SQL against a fresh copy of the shop database (sql-seed.sql) using SQLite in WebAssembly.
importScripts('vendor/sqljs/sql-wasm.js');
const ready = Promise.all([
  initSqlJs({ locateFile: (f) => 'vendor/sqljs/' + f }),
  fetch('sql-seed.sql').then((r) => r.text()),
]);

onmessage = async (ev) => {
  try {
    const [SQL, seed] = await ready;
    const db = new SQL.Database();
    db.run(seed);
    const results = [];
    let error = null;
    // run statement by statement and keep going after an error, like psql does
    try {
      for (const stmt of db.iterateStatements(ev.data.code)) {
        const sql = stmt.getSQL().trim();
        try {
          const columns = stmt.getColumnNames();
          const rows = [];
          while (stmt.step()) rows.push(stmt.get());
          if (columns.length) results.push({ sql, columns, rows });
          else results.push({ sql, changes: db.getRowsModified() });
        } catch (e) {
          results.push({ sql, error: String(e.message || e) });
        } finally {
          stmt.free();
        }
      }
    } catch (e) {
      error = String(e.message || e);   // a syntax error stops parsing
    }
    db.close();
    postMessage({ results, error });
  } catch (e) {
    postMessage({ results: [], error: 'SQLite could not load: ' + (e.message || e) });
  }
};
