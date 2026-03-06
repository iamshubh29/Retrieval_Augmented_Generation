import sql from 'mssql';

let pool: sql.ConnectionPool | null = null;

export async function getDb(): Promise<sql.ConnectionPool> {
  if (pool) return pool;
  const connectionString = process.env.AZURE_SQL_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error('AZURE_SQL_CONNECTION_STRING is not set. Use Microsoft Azure SQL or SQL Server connection string.');
  }
  pool = await sql.connect(connectionString);
  return pool;
}

export interface DocumentRow {
  id: string;
  user_id: string;
  title: string;
  file_name: string;
  file_size: number;
  content: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface ConversationRow {
  id: string;
  user_id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  sources: string | null;
  created_at: Date;
}
