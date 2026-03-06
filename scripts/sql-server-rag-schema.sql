-- =============================================
-- RAG App - SQL Server Tables
-- Run this script in SQL Server Management Studio (SSMS)
-- =============================================
-- 1. Connect to your SQL Server in SSMS
-- 2. Create a new database (or use existing): e.g. RAGDb
-- 3. Select that database in the dropdown
-- 4. Open this file and execute (F5)
-- =============================================

-- Table: documents
-- Stores uploaded file metadata (PDF, TXT, DOCX). Vectors are in Upstash.
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'documents')
BEGIN
    CREATE TABLE documents (
        id              NVARCHAR(36)  PRIMARY KEY,
        user_id         NVARCHAR(100) NOT NULL,
        title           NVARCHAR(500) NOT NULL,
        file_name       NVARCHAR(500) NOT NULL,
        file_size       BIGINT        NOT NULL,
        content         NVARCHAR(MAX) NOT NULL,
        status          NVARCHAR(20)  NOT NULL DEFAULT 'processing',
        created_at      DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
        updated_at      DATETIME2     NOT NULL DEFAULT GETUTCDATE()
    );
    CREATE INDEX IX_documents_user_id ON documents(user_id);
    CREATE INDEX IX_documents_created_at ON documents(created_at DESC);
    PRINT 'Table [documents] created.';
END
ELSE
    PRINT 'Table [documents] already exists.';

-- Table: conversations
-- One row per chat session.
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'conversations')
BEGIN
    CREATE TABLE conversations (
        id              NVARCHAR(36)  PRIMARY KEY,
        user_id         NVARCHAR(100) NOT NULL,
        title           NVARCHAR(500) NOT NULL DEFAULT 'New Conversation',
        created_at      DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
        updated_at      DATETIME2     NOT NULL DEFAULT GETUTCDATE()
    );
    CREATE INDEX IX_conversations_user_id ON conversations(user_id);
    CREATE INDEX IX_conversations_updated_at ON conversations(updated_at DESC);
    PRINT 'Table [conversations] created.';
END
ELSE
    PRINT 'Table [conversations] already exists.';

-- Table: messages
-- Chat messages; sources = JSON array of RAG source snippets.
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'messages')
BEGIN
    CREATE TABLE messages (
        id               NVARCHAR(36)  PRIMARY KEY,
        conversation_id  NVARCHAR(36)  NOT NULL,
        role             NVARCHAR(20)  NOT NULL,
        content          NVARCHAR(MAX) NOT NULL,
        sources          NVARCHAR(MAX) NULL,
        created_at       DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_messages_conversation
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );
    CREATE INDEX IX_messages_conversation_id ON messages(conversation_id);
    CREATE INDEX IX_messages_created_at ON messages(created_at);
    PRINT 'Table [messages] created.';
END
ELSE
    PRINT 'Table [messages] already exists.';

PRINT 'RAG schema setup complete.';
