/**
 * Test SQL Server connection using AZURE_SQL_CONNECTION_STRING from .env.local
 * Run from RAG folder: node scripts/test-sql-connection.js
 */

const path = require('path');
const fs = require('fs');

// Load .env.local from project root (RAG folder)
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const eq = line.indexOf('=');
    if (eq > 0) {
      const key = line.slice(0, eq).trim();
      const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (key && !key.startsWith('#')) process.env[key] = value;
    }
  });
  console.log('Loaded .env.local from', envPath);
} else {
  console.error('.env.local not found at', envPath);
  console.error('Create it in the RAG folder with: AZURE_SQL_CONNECTION_STRING=Server=...;Database=...;User Id=...;Password=...');
  process.exit(1);
}

const connectionString = process.env.AZURE_SQL_CONNECTION_STRING;
if (!connectionString) {
  console.error('AZURE_SQL_CONNECTION_STRING is not set in .env.local');
  process.exit(1);
}

// Hide password in log
const safeLog = connectionString.replace(/Password=[^;]+/i, 'Password=***');
console.log('Connection string (masked):', safeLog);
console.log('');

const sql = require('mssql');

async function test() {
  console.log('Attempting to connect to SQL Server...');
  const start = Date.now();

  try {
    const pool = await sql.connect(connectionString);
    const elapsed = Date.now() - start;
    console.log('Connected successfully in', elapsed, 'ms');

    const result = await pool.request().query('SELECT @@VERSION AS version');
    const version = result.recordset[0]?.version || 'unknown';
    console.log('Server version:', version.split('\n')[0]);

    await pool.close();
    console.log('');
    console.log('Connection test passed. Your app can use this connection.');
    process.exit(0);
  } catch (err) {
    const elapsed = Date.now() - start;
    console.error('');
    console.error('Connection FAILED after', elapsed, 'ms');
    console.error('Error:', err.message);
    if (err.code) console.error('Code:', err.code);
    console.error('');
    console.error('Common fixes:');
    console.error('  1. In SSMS, check the exact "Server name" you use to connect (e.g. .\\SQLEXPRESS or .\\SQLEXPRESS01).');
    console.error('  2. Use that same server in the connection string: Server=.\\SQLEXPRESS or Server=localhost\\SQLEXPRESS');
    console.error('  3. Ensure SQL Server (MSSQLSERVER or SQLEXPRESS) service is running: services.msc -> SQL Server (SQLEXPRESS)');
    console.error('  4. Enable TCP/IP: SQL Server Configuration Manager -> SQL Server Network Configuration -> Protocols -> TCP/IP -> Enabled.');
    console.error('  5. Try Server=localhost\\\\SQLEXPRESS (double backslash in .env) or Server=(local)\\\\SQLEXPRESS');
    process.exit(1);
  }
}

test();
