# RAG System Setup Guide

This guide will help you set up and run the RAG (Retrieval Augmented Generation) chatbot system.

## Prerequisites

1. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
2. **OpenAI API Key**: Get one at [platform.openai.com](https://platform.openai.com)

## Step-by-Step Setup

### 1. Get Your Supabase Credentials

1. Log in to your Supabase dashboard
2. Create a new project (or use an existing one)
3. Go to **Settings** > **API**
4. Copy the following:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **Anon/Public Key** (starts with `eyJ...`)

### 2. Get Your OpenAI API Key

1. Log in to [platform.openai.com](https://platform.openai.com)
2. Go to **API Keys** section
3. Click **Create new secret key**
4. Copy the key (starts with `sk-...`)

### 3. Configure Environment Variables

Open the `.env.local` file in the project root and replace the placeholder values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here
OPENAI_API_KEY=sk-your-actual-openai-key-here
```

**Important**: The database schema has already been applied to your Supabase project with the following tables:
- `documents` - Stores uploaded documents
- `document_chunks` - Stores text chunks with vector embeddings
- `conversations` - Stores chat conversations
- `messages` - Stores individual messages

All tables have Row Level Security (RLS) enabled for data protection.

### 4. Install Dependencies

```bash
npm install
```

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How to Use the Application

### Upload Documents

1. Click the **Documents** tab in the sidebar
2. Click **Upload Document**
3. Select a `.txt` or `.md` file
4. Wait for processing (the system will chunk the document and generate embeddings)
5. Once complete, the document will show as "Ready"

### Chat with Your Documents

1. Click the **Chats** tab
2. Click **New Chat** to start a conversation
3. Type your question in the input box
4. The AI will search your documents and provide contextual answers
5. Sources used for the answer will be displayed below the response

### Managing Conversations

- All conversations are saved automatically
- Click on any conversation in the sidebar to view it
- Start a new chat anytime to create a separate conversation thread

## System Architecture

### Document Processing Flow

```
Upload File → Store Document → Split into Chunks → Generate Embeddings → Store in Database
```

### Chat Flow with RAG

```
User Question → Generate Query Embedding → Vector Similarity Search →
Retrieve Top 5 Chunks → Create Context → Send to GPT → Get Response → Display with Sources
```

## Features

### Current Features
- Document upload (TXT, MD files)
- Automatic text chunking and embedding
- Vector similarity search
- Contextual AI responses
- Source attribution
- Conversation history
- Light theme UI

### Technical Details
- **Embedding Model**: OpenAI text-embedding-ada-002 (1536 dimensions)
- **Chat Model**: GPT-3.5-turbo
- **Chunk Size**: ~1000 characters
- **Similarity Threshold**: 0.7 (70% similarity)
- **Top Results**: 5 most relevant chunks

## Troubleshooting

### Build Errors

If you see Supabase URL validation errors during build:
- Ensure `.env.local` has valid URLs (not placeholder text)
- The file should contain actual Supabase and OpenAI credentials

### Document Upload Fails

- Check that your OpenAI API key is valid
- Ensure the file is .txt or .md format
- Check browser console for detailed error messages

### Chat Not Working

- Verify OpenAI API key has sufficient credits
- Check that documents are in "Ready" state
- Ensure Supabase credentials are correct

### No Relevant Answers

- Upload more documents related to your questions
- Try rephrasing your question
- Check that documents contain relevant information

## Database Schema

The system uses the following tables:

### documents
- `id`: Unique identifier
- `user_id`: Owner of the document
- `title`: Document title
- `file_name`: Original filename
- `file_size`: Size in bytes
- `content`: Full text content
- `status`: processing/completed/failed
- `created_at`, `updated_at`: Timestamps

### document_chunks
- `id`: Unique identifier
- `document_id`: Reference to parent document
- `content`: Text chunk
- `embedding`: Vector (1536 dimensions)
- `chunk_index`: Order in document
- `created_at`: Timestamp

### conversations
- `id`: Unique identifier
- `user_id`: Owner
- `title`: Conversation title
- `created_at`, `updated_at`: Timestamps

### messages
- `id`: Unique identifier
- `conversation_id`: Reference to conversation
- `role`: user/assistant/system
- `content`: Message text
- `sources`: JSON array of source chunks
- `created_at`: Timestamp

## Security

- All data is protected by Row Level Security (RLS)
- Users can only access their own documents and conversations
- API keys are stored securely in environment variables
- Supabase handles authentication and authorization

## Customization

### Adjust Chunk Size

Edit `lib/embeddings.ts`:
```typescript
export function chunkText(text: string, maxChunkSize: number = 1500) {
  // Your custom chunk size
}
```

### Change Similarity Threshold

Edit `app/api/chat/route.ts`:
```typescript
const { data: similarChunks } = await supabase.rpc('match_document_chunks', {
  query_embedding: queryEmbedding,
  match_threshold: 0.8, // Increase for more strict matching
  match_count: 5,
  user_id_param: userId,
});
```

### Switch to GPT-4

Edit `app/api/chat/route.ts`:
```typescript
body: JSON.stringify({
  model: 'gpt-4', // Change to gpt-4
  messages: [...],
}),
```

## Cost Considerations

### OpenAI Costs
- **Embeddings**: ~$0.0001 per 1K tokens
- **GPT-3.5-turbo**: ~$0.002 per 1K tokens
- **GPT-4**: ~$0.03 per 1K tokens (input)

### Example Costs
- Uploading a 10-page document (~5,000 words): ~$0.001
- Each chat message: ~$0.001-$0.01 depending on context

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the README_RAG.md file
3. Check Supabase and OpenAI documentation
4. Verify your API keys and credentials

## Next Steps

Now that your system is set up:
1. Upload a few test documents
2. Try asking questions about the documents
3. Experiment with different types of questions
4. Monitor your OpenAI usage in the dashboard
5. Consider adding authentication for production use

Happy chatting with your documents!
