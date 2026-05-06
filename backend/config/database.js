const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'taskmanager.db');
let db = null;

async function initDb() {
  if (db) return db;
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }
  db.run('PRAGMA foreign_keys = ON;');
  createSchema();
  persistDb();
  return db;
}

function createSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL, avatar TEXT, role TEXT DEFAULT 'member',
      created_at DATETIME DEFAULT (datetime('now')), updated_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT,
      color TEXT DEFAULT '#6366f1', status TEXT DEFAULT 'active',
      owner_id TEXT NOT NULL, due_date DATE,
      created_at DATETIME DEFAULT (datetime('now')), updated_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS project_members (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL, user_id TEXT NOT NULL,
      role TEXT DEFAULT 'member', joined_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(project_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT,
      status TEXT DEFAULT 'todo', priority TEXT DEFAULT 'medium',
      project_id TEXT NOT NULL, assignee_id TEXT, created_by TEXT NOT NULL,
      due_date DATE, tags TEXT DEFAULT '[]', position INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT (datetime('now')), updated_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY, task_id TEXT NOT NULL, user_id TEXT NOT NULL,
      content TEXT NOT NULL, created_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, project_id TEXT, task_id TEXT,
      action TEXT NOT NULL, details TEXT, created_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  try {
    db.run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'member'");
  } catch (e) {}
}

function persistDb() {
  if (!db) return;
  try { fs.writeFileSync(DB_PATH, Buffer.from(db.export())); } catch(e) {}
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function queryGet(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

function queryRun(sql, params = []) {
  db.run(sql, params);
  persistDb();
}

function getDb() {
  return { queryAll, queryGet, queryRun };
}

module.exports = { initDb, getDb };
