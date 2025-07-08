import Database from 'better-sqlite3';

const db = new Database('taskia.db');

db.exec('DROP TABLE IF EXISTS users');
db.exec(
  'CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, google_id TEXT UNIQUE)',
);
