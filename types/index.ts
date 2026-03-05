export interface Document {
  id: string;
  user_id: string;
  title: string;
  file_name: string;
  file_size: number;
  content: string;
  status: 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: Array<{
    documentId: string;
    content: string;
  }>;
  created_at: string;
}
