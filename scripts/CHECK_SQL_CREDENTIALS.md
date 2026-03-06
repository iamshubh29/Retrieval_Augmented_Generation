# How to Check SQL Server Server Name, Login (User Id), and Password

Do these steps **in SQL Server Management Studio (SSMS)** after you have connected successfully (e.g. with Windows Authentication).

---

## 1. Check the correct **Server name** (instance name)

**Option A – From SSMS after connecting**

- After you connect, look at the **object Explorer** (left panel).
- At the very top it shows the server you’re connected to, e.g.:
  - `YourPCName\SQLEXPRESS`
  - `YourPCName\SQLEXPRESS01`
  - `(localdb)\MSSQLLocalDB`
- Use **exactly that** in your connection string.  
  In Node.js/.env you often use:
  - `localhost` instead of `YourPCName`
  - So: `Server=localhost\SQLEXPRESS01` or `Server=localhost\\SQLEXPRESS01` (double backslash in .env)

**Option B – From SSMS Connect dialog**

- File → Connect Object Explorer (or click “Connect”).
- In **Server name** you’ll see or type the same value (e.g. `.\SQLEXPRESS01`).
- That value is your **server/instance name**.

---

## 2. Check that the **Login (User Id)** exists

1. In SSMS, in **Object Explorer**, expand your server.
2. Expand **Security** → **Logins**.
3. Look for the login name you use in the app (e.g. `ShubhUser`).
4. If it’s **not there**, the User Id is wrong. Create it (see “Create the login” below) or use another existing login (e.g. `sa`).

---

## 3. Check that the login can use your **Database** and has a **password**

1. **Double‑click the login** (e.g. `ShubhUser`) under **Security** → **Logins**.
2. **User Mapping** (left side):
   - Ensure **RAGDb** (or your database) is **checked** in the list.
   - If not, check it and pick a **default schema** (e.g. `dbo`). Click OK.
3. **General** (left side):
   - **Authentication** should be **SQL Server authentication**.
   - There is no “show password” here; you can only **reset** it:
     - Set a new password in the **Password** / **Confirm password** boxes.
     - Click OK, then use this **new** password in your `.env.local` as `Password=...`.

---

## 4. Create the login (if it doesn’t exist)

1. Right‑click **Security** → **Logins** → **New Login...**
2. **Login name:** e.g. `ShubhUser`
3. Select **SQL Server authentication**.
4. Enter **Password** and **Confirm password** (remember this for `.env.local`).
5. Uncheck **Enforce password policy** if you want (only for local dev).
6. Go to **User Mapping**:
   - Map to database **RAGDb**.
   - Default schema: **dbo**.
   - In “Database role membership”, check **db_owner** (or at least **db_datareader**, **db_datawriter**).
7. Click OK.

Then in `.env.local` use:

- **User Id** = that login name (e.g. `ShubhUser`)
- **Password** = the password you just set

---

## 5. Quick reference: what error usually means what

| Error / behavior | Usually means |
|------------------|----------------|
| **ETIMEOUT** (e.g. “Failed to connect in 15000ms”) | Server/instance not reachable: wrong server name, SQL Server service stopped, or TCP/IP/firewall. |
| **Login failed for user 'ShubhUser'** | Wrong **User Id** or **Password**, or login doesn’t exist. |
| **Cannot open database 'RAGDb'** | Database doesn’t exist or the login has no access (check User Mapping). |

So: **first** fix the server name and service (so the connection test stops timing out); **then** in SSMS check the login and password as above.
