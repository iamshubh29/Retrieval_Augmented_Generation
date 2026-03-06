-- =============================================
-- Grant RAG app user permissions on RAGDb tables
-- Run this in SSMS while connected as an admin (e.g. Windows Auth or sa)
-- =============================================
-- 1. Connect to .\SQLEXPRESS01 in SSMS
-- 2. Select database RAGDb
-- 3. Open this file and execute (F5)
-- =============================================

USE RAGDb;
GO

-- Replace with your app login name if different (must match User Id in .env.local)
DECLARE @AppUser SYSNAME = N'ShubhUser';

-- Create database user for the login if it doesn't exist (login must already exist at server level)
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = @AppUser AND type IN ('S','U'))
BEGIN
    DECLARE @Sql NVARCHAR(500) = N'CREATE USER [' + @AppUser + N'] FOR LOGIN [' + @AppUser + N']';
    EXEC sp_executesql @Sql;
    PRINT 'Created user ' + @AppUser + ' in RAGDb.';
END
ELSE
    PRINT 'User ' + @AppUser + ' already exists in RAGDb.';

-- Option A: Grant on each table
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.documents TO [ShubhUser];
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.conversations TO [ShubhUser];
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.messages TO [ShubhUser];

-- Option B (alternative): Add to database roles (uncomment if you prefer)
-- ALTER ROLE db_datareader ADD MEMBER [ShubhUser];
-- ALTER ROLE db_datawriter ADD MEMBER [ShubhUser];

PRINT 'Granted SELECT, INSERT, UPDATE, DELETE on documents, conversations, messages to ShubhUser.';
PRINT 'Done. Restart the app or refresh the page.';
GO
