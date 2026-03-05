# RAG Assistant - AI Powered Document Q&A

A complete Retrieval Augmented Generation (RAG) system built with Next.js, Supabase, and OpenAI. Upload documents and chat with an AI assistant that uses your documents as context to provide accurate answers.

## Features

- **Document Upload & Processing**: Upload .txt or .md files that are automatically chunked and embedded
- **Vector Search**: Uses pgvector for semantic similarity search across your documents
- **Conversational AI**: Chat interface powered by OpenAI GPT models
- **Source Attribution**: See which documents were used to answer your questions
- **Beautiful UI**: Clean, light theme interface optimized for productivity
- **Secure**: Row Level Security (RLS) ensures users can only access their own data

## Tech Stack

- **Frontend**: Next.js 13, React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL with pgvector)
- **AI**: OpenAI (GPT-3.5-turbo for chat, text-embedding-ada-002 for embeddings)

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in the root directory with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
```

### 2. Supabase Setup

The database schema is already applied and includes:
- `documents` table for storing uploaded files
- `document_chunks` table with vector embeddings
- `conversations` and `messages` tables for chat history
- Vector similarity search function
- Row Level Security policies

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## How It Works

### 1. Document Processing Pipeline

When you upload a document:
1. File is read and stored in the `documents` table
2. Content is split into chunks (~1000 characters each)
3. Each chunk is converted to embeddings using OpenAI's ada-002 model
4. Embeddings are stored in the `document_chunks` table with pgvector

### 2. Chat with RAG

When you ask a question:
1. Your question is converted to an embedding
2. Vector similarity search finds the 5 most relevant document chunks
3. Relevant chunks are used as context for the AI
4. OpenAI GPT-3.5-turbo generates an answer using the context
5. Sources are displayed so you know which documents were used

### 3. Conversation Management

- Each chat creates a new conversation
- Messages are stored with their sources
- You can switch between conversations in the sidebar

## Usage Tips

- Upload multiple documents to build a comprehensive knowledge base
- Ask specific questions for more accurate answers
- Check the sources to verify information
- Start a new chat for different topics

## Architecture

```
app/
├── api/
│   ├── chat/          # RAG chat endpoint
│   ├── documents/     # Document upload & retrieval
│   ├── conversations/ # Conversation management
│   └── messages/      # Message retrieval
├── page.tsx           # Main application page
└── layout.tsx         # Root layout

components/
├── chat-interface.tsx # Chat UI component
└── sidebar.tsx        # Sidebar with conversations & documents

lib/
├── supabase.ts        # Supabase client
└── embeddings.ts      # Embedding & chunking utilities

types/
└── index.ts           # TypeScript type definitions
```

## Security

- All tables use Row Level Security (RLS)
- Users can only access their own documents and conversations
- API endpoints validate user ownership
- Vector search is scoped to user's documents only

## Future Enhancements

- User authentication with Supabase Auth
- Support for more file types (PDF, DOCX)
- Streaming responses
- Document management (delete, update)
- Advanced search filters
- Export conversations
- Conversation sharing

## License

MIT
