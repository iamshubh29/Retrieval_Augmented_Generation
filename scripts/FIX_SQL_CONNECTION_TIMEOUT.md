# Fix "Failed to connect in 15000ms" (ETIMEOUT) – SSMS works but app doesn't

SSMS connects to `.\SQLEXPRESS01` using **Named Pipes** or **Shared Memory**. The Node.js app uses **TCP/IP**. If TCP/IP is disabled or **SQL Server Browser** is stopped, the app will time out.

Do these steps **in order**.

---

## 1. Enable TCP/IP for SQLEXPRESS01

1. Open **SQL Server Configuration Manager**  
   (Start menu → "SQL Server Configuration Manager", or run `SQLServerManager17.msc` if you have SQL 2022).
2. In the left pane: **SQL Server Network Configuration** → **Protocols for SQLEXPRESS01**.
3. Right‑click **TCP/IP** → **Enable**.
4. If it was disabled, you must **restart the SQL Server service**:
   - Open **services.msc** → find **SQL Server (SQLEXPRESS01)** → Right‑click → **Restart**.

---

## 2. Start SQL Server Browser (required for named instances)

For a **named instance** like `SQLEXPRESS01`, the app finds it via **SQL Server Browser**.

1. Open **services.msc** (Win + R → `services.msc` → Enter).
2. Find **SQL Server Browser**.
3. Right‑click → **Start** (and set **Startup type** to **Automatic** if you want it to start with Windows).

---

## 3. Run the connection test again

From the **RAG** folder:

```bash
node scripts/test-sql-connection.js
```

If you see **"Connection test passed"**, the app will work. If it still times out, try the connection string with `(local)` below.

---

## 4. Optional: try (local) in the connection string

In **RAG/.env.local**, try:

```env
AZURE_SQL_CONNECTION_STRING=Server=(local)\\SQLEXPRESS01;Database=RAGDb;User Id=ShubhUser;Password=Shubh@29;Encrypt=false;TrustServerCertificate=true
```

Then run `node scripts/test-sql-connection.js` again.
