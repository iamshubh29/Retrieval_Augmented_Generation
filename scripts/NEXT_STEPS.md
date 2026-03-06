# What to do now – after fixing SQL login/password

## Step 1: Make sure the connection test passes

From the **RAG** folder run:

```bash
node scripts/test-sql-connection.js
```

- If you see **"Connection test passed"** → go to **Step 2**.
- If you still see **"Connection FAILED" (ETIMEOUT)** → do the following, then run the test again.

### If you still get ETIMEOUT

1. **Check SQL Server service**
   - Press `Win + R` → type `services.msc` → Enter.
   - Find **SQL Server (SQLEXPRESS01)** or **SQL Server (SQLEXPRESS)**.
   - Status must be **Running**. If not, right‑click → **Start**.

2. **Use the exact server name from SSMS**
   - In SSMS, when you connect, what do you type in **Server name**? (e.g. `.\SQLEXPRESS01` or `(local)\SQLEXPRESS01` or `YourPCName\SQLEXPRESS01`).
   - In `.env.local`, try that **exact** value. For a backslash use **double backslash** in the file:
     - Example: `Server=localhost\\SQLEXPRESS01` or `Server=(local)\\SQLEXPRESS01`

3. **Try default instance (if you use default SQL Server, not Express)**
   - If you connect in SSMS with just `localhost` or `.`, then in `.env.local` use:
     - `Server=localhost;Database=RAGDb;User Id=ShubhUser;Password=Shubh@29;Encrypt=false;TrustServerCertificate=true`
     - (No `\SQLEXPRESS01`.)

4. **Enable TCP/IP** (if still failing)
   - Open **SQL Server Configuration Manager**.
   - **SQL Server Network Configuration** → **Protocols for SQLEXPRESS01**.
   - Right‑click **TCP/IP** → **Enable**.
   - Restart **SQL Server (SQLEXPRESS01)** in `services.msc`.

---

## Step 2: Run the app and test RAG

When `node scripts/test-sql-connection.js` shows **"Connection test passed"**:

1. **Start the app** (from the RAG folder):
   ```bash
   npm run dev
   ```

2. Open **http://localhost:3000** in your browser.

3. **Test the flow:**
   - Go to the **Documents** tab in the sidebar.
   - **Upload** a PDF, TXT, or DOCX file. Wait until it shows **Ready**.
   - Go to **Chats** → **New Chat**.
   - Ask a question about the content you uploaded. You should get an answer and see **Source 1**, **Source 2**, etc.

If anything fails (upload error, chat error), check the terminal where `npm run dev` is running for the error message.
