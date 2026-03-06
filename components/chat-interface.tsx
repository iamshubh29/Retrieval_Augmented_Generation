'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Message, Document } from '@/types';

interface ChatInterfaceProps {
  conversationId: string | null;
  userId: string;
  onNewConversation: (id: string) => void;
}

export function ChatInterface({
  conversationId,
  userId,
  onNewConversation,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [scope, setScope] = useState<'global' | 'specific'>('global');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');

  useEffect(() => {
    if (conversationId) {
      fetchMessages();
    } else {
      setMessages([]);
    }
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const res = await fetch(`/api/documents?userId=${userId}`);
        const data = await res.json();
        const list: Document[] = Array.isArray(data.documents)
          ? data.documents
          : [];
        setDocuments(list.filter((d) => d.status === 'completed'));
      } catch (e) {
        console.error('Failed to load documents list', e);
      }
    };
    fetchDocs();
  }, [userId]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch(
        `/api/messages?conversationId=${conversationId}`,
        { cache: 'no-store' }
      );
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      conversation_id: conversationId || '',
      role: 'user',
      content: input,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          conversationId,
          userId,
          scope,
          documentId:
            scope === 'specific' && selectedDocId ? selectedDocId : undefined,
        }),
      });

      const data = await response.json();

      if (!conversationId && data.conversationId) {
        onNewConversation(data.conversationId);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        conversation_id: data.conversationId,
        role: 'assistant',
        content: data.message,
        sources: data.sources,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  async function startEdit(msgId: string, current: string) {
    setEditingId(msgId);
    setEditText(current);
  }

  async function cancelEdit() {
    setEditingId(null);
    setEditText('');
  }

  async function saveEdit(messageId: string) {
    if (!editText.trim()) return;
    try {
      // 1) Persist the edited text for the user message
      await fetch(`/api/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editText }),
      });
      // 2) Update local state for the edited message
      const idx = messages.findIndex((m) => m.id === messageId);
      const updatedMessages = messages.map((m) =>
        m.id === messageId ? { ...m, content: editText } : m
      );
      // 3) Delete all subsequent messages (branching like ChatGPT)
      const tail = updatedMessages.slice(idx + 1);
      await Promise.allSettled(
        tail.map((m) =>
          fetch(`/api/messages/${m.id}`, { method: 'DELETE' })
        )
      );
      const truncated = updatedMessages.slice(0, idx + 1);
      setMessages(truncated);
      setEditingId(null);
      setEditText('');
      setIsLoading(true);
      // 4) Regenerate assistant answer for the edited prompt
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: editText,
          conversationId,
          userId,
          scope,
          documentId:
            scope === 'specific' && selectedDocId ? selectedDocId : undefined,
        }),
      });
      const data = await response.json();
      const assistantMessage: Message = {
        id: (Date.now() + 2).toString(),
        conversation_id: data.conversationId,
        role: 'assistant',
        content: data.message,
        sources: data.sources,
        created_at: new Date().toISOString(),
      };
      // 5) Insert the assistant reply immediately after the edited message
      const withAnswer = [
        ...truncated.slice(0, idx + 1),
        assistantMessage,
        ...truncated.slice(idx + 1),
      ];
      setMessages(withAnswer);
    } catch (e) {
      console.error('Failed to edit message', e);
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteMessage(messageId: string) {
    const ok = window.confirm('Delete this message? This cannot be undone.');
    if (!ok) return;
    const prev = messages;
    setMessages((curr) => curr.filter((m) => m.id !== messageId));
    fetch(`/api/messages/${messageId}`, { method: 'DELETE' }).catch((e) => {
      console.error('Failed to delete message', e);
      setMessages(prev);
    });
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <Bot className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h2 className="text-2xl font-semibold mb-2 text-gray-700">
                Welcome to RAG Chat
              </h2>
              <p className="text-gray-500">
                Upload documents and ask questions to get started
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-blue-600" />
                </div>
              )}

              <div
                className={`flex flex-col gap-2 max-w-[80%] ${
                  message.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <Card
                  className={`p-4 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border shadow-sm'
                  }`}
                >
                  {editingId === message.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="min-h-[80px] bg-white text-black"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => cancelEdit()}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          onClick={() => saveEdit(message.id)}
                        >
                          Save & Regenerate
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </Card>

                {message.sources && message.sources.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {Array.from(
                      new Map(
                        message.sources
                          .map((s) => ({
                            label: s.fileName || s.title || s.documentId || 'Source',
                            key: (s.fileName || s.title || s.documentId || 'Source') + '',
                          }))
                          .map((x) => [x.key, x])
                      ).values()
                    ).map((u, idx) => (
                      <div
                        key={u.key}
                        className="text-xs bg-gray-100 px-2 py-1 rounded flex items-center gap-1"
                        title={u.label}
                      >
                        <FileText className="w-3 h-3" />
                        <span>{u.label}</span>
                      </div>
                    ))}
                  </div>
                )}

                {message.role === 'user' && editingId !== message.id && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(message.id, message.content)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteMessage(message.id)}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </div>

              {message.role === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Bot className="w-5 h-5 text-blue-600" />
              </div>
              <Card className="p-4 bg-white border shadow-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
                  <div
                    className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                    style={{ animationDelay: '0.1s' }}
                  />
                  <div
                    className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  />
                </div>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t bg-white p-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <label className="text-sm text-gray-600">Search</label>
            <select
              className="border rounded px-2 py-1 text-sm"
              value={scope}
              onChange={(e) =>
                setScope(e.target.value === 'specific' ? 'specific' : 'global')
              }
            >
              <option value="global">Global (all documents)</option>
              <option value="specific">Specific document</option>
            </select>
            {scope === 'specific' && (
              <select
                className="border rounded px-2 py-1 text-sm max-w-xs"
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value)}
              >
                <option value="">Select a document…</option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your documents..."
              className="min-h-[60px] resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="h-[60px] px-6"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
