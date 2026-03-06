'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, FileText, Plus, Upload, Loader as Loader2, CircleCheck as CheckCircle, Circle as XCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Document, Conversation } from '@/types';

interface SidebarProps {
  userId: string;
  activeConversationId: string | null;
  onSelectConversation: (id: string | null) => void;
}

export function Sidebar({
  userId,
  activeConversationId,
  onSelectConversation,
}: SidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);

  useEffect(() => {
    fetchConversations();
    fetchDocuments();
  }, [userId]);

  const fetchConversations = async () => {
    try {
      setIsLoadingConversations(true);
      const response = await fetch(`/api/conversations?userId=${userId}`, {
        cache: 'no-store',
      });
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      setIsLoadingDocuments(true);
      const response = await fetch(`/api/documents?userId=${userId}`, {
        cache: 'no-store',
      });
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  const deleteConversation = async (id: string) => {
    const ok = window.confirm('Delete this chat and all its messages?');
    if (!ok) return;
    // Optimistic update
    const prev = conversations;
    setConversations((curr) => curr.filter((c) => c.id !== id));
    if (activeConversationId === id) onSelectConversation(null);
    fetch(`/api/conversations/${id}`, { method: 'DELETE' }).catch((e) => {
      console.error('Error deleting conversation:', e);
      // Rollback on failure
      setConversations(prev);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (
      !file.name.toLowerCase().endsWith('.txt') &&
      !file.name.toLowerCase().endsWith('.md') &&
      !file.name.toLowerCase().endsWith('.pdf') &&
      !file.name.toLowerCase().endsWith('.docx')
    ) {
      alert('Please upload a .txt, .md, .pdf, or .docx file');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);

      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        await fetchDocuments();
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="w-80 border-r bg-gray-50 flex flex-col h-full">
      <div className="p-4 border-b bg-white">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Bot className="w-6 h-6 text-blue-600" />
          RAG Assistant
        </h1>
      </div>

      <Tabs defaultValue="chats" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 m-2">
          <TabsTrigger value="chats">
            <MessageSquare className="w-4 h-4 mr-2" />
            Chats
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="w-4 h-4 mr-2" />
            Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chats" className="flex-1 mt-0">
          <div className="p-2">
            <Button
              onClick={() => onSelectConversation(null)}
              className="w-full mb-2"
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Chat
            </Button>
          </div>

          <ScrollArea className="flex-1 px-2">
            <div className="space-y-2">
              {isLoadingConversations && (
                <div className="p-3 text-xs text-gray-500">Loading chats…</div>
              )}
              {!isLoadingConversations &&
                conversations.map((conv) => (
                <Card
                  key={conv.id}
                  className={`p-3 cursor-pointer transition-all hover:shadow-md ${
                    activeConversationId === conv.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'bg-white'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 mt-1 text-gray-500 flex-shrink-0" />
                    <div
                      className="flex-1 min-w-0"
                      onClick={() => onSelectConversation(conv.id)}
                    >
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {conv.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(conv.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      aria-label="Delete conversation"
                      className="p-1 rounded hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conv.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </Card>
              ))}

              {!isLoadingConversations && conversations.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No conversations yet
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="documents" className="flex-1 mt-0">
          <div className="p-2">
            <Button
              className="w-full mb-2"
              variant="outline"
              disabled={isUploading}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Document
                </>
              )}
            </Button>
            <input
              id="file-upload"
              type="file"
              accept=".txt,.md,.pdf,.docx"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          <ScrollArea className="flex-1 px-2">
            <div className="space-y-2">
              {isLoadingDocuments && (
                <div className="p-3 text-xs text-gray-500">Loading documents…</div>
              )}
              {!isLoadingDocuments &&
                documents.map((doc) => (
                <Card key={doc.id} className="p-3 bg-white">
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 mt-1 text-gray-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {doc.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatFileSize(doc.file_size)}
                      </p>
                      <div className="flex items-center gap-1 mt-2">
                        {doc.status === 'completed' && (
                          <>
                            <CheckCircle className="w-3 h-3 text-green-500" />
                            <span className="text-xs text-green-600">
                              Ready
                            </span>
                          </>
                        )}
                        {doc.status === 'processing' && (
                          <>
                            <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                            <span className="text-xs text-blue-600">
                              Processing
                            </span>
                          </>
                        )}
                        {doc.status === 'failed' && (
                          <>
                            <XCircle className="w-3 h-3 text-red-500" />
                            <span className="text-xs text-red-600">Failed</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}

              {!isLoadingDocuments && documents.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No documents uploaded yet
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Bot({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      <line x1="8" y1="16" x2="8" y2="16" />
      <line x1="16" y1="16" x2="16" y2="16" />
    </svg>
  );
}
