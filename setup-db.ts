import { db } from './lib/db';

db.exec('DROP TABLE IF EXISTS users');
db.exec(
  'CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, google_id TEXT UNIQUE)',
);

db.exec('DROP TABLE IF EXISTS tasks');
db.exec(
  'CREATE TABLE tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, status TEXT NOT NULL, user_id INTEGER NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id))',
);
