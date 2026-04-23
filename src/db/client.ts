import Database from '@tauri-apps/plugin-sql';
import rawSchema from './schema.sql?raw';

let connect: Promise<Database> | null = null;

function splitStatements(sql: string): string[] {
  const noComments = sql.replace(/--[^\n]*/g, '');
  return noComments
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function getDatabase(): Promise<Database> {
  if (!connect) {
    connect = Database.load('sqlite:bionotes.db');
  }
  return connect;
}

/**
 * Açık bağlantı, şema (IF NOT EXISTS) ve PRAGMA foreign_keys.
 */
export async function initDB(): Promise<Database> {
  const db = await getDatabase();
  await db.execute('PRAGMA foreign_keys = ON', []);
  for (const statement of splitStatements(rawSchema)) {
    await db.execute(`${statement};`, []);
  }
  return db;
}
