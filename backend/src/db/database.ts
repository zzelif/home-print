import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export class DatabaseManager {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const finalPath = dbPath || path.join(process.cwd(), 'homeprint.sqlite');
    const dir = path.dirname(finalPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(finalPath);
    this.initPragmas();
    this.initSchema();
  }

  private initPragmas() {
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('temp_store = MEMORY');
  }

  private initSchema() {
    const candidatePaths = [
      path.join(__dirname, 'schema.sql'),
      path.join(__dirname, '..', 'src', 'db', 'schema.sql'),
      path.join(process.cwd(), 'src', 'db', 'schema.sql'),
      path.join(process.cwd(), 'backend', 'src', 'db', 'schema.sql'),
    ];

    for (const schemaPath of candidatePaths) {
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
        this.db.exec(schemaSql);
        break;
      }
    }
  }

  getDb(): Database.Database {
    return this.db;
  }

  close() {
    this.db.close();
  }
}

let instance: DatabaseManager | null = null;

export function getDatabase(dbPath?: string): Database.Database {
  if (!instance) {
    instance = new DatabaseManager(dbPath);
  }
  return instance.getDb();
}
