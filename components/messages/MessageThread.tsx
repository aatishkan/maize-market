'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { Message } from '@/types/database';

interface MessageThreadProps {
  conversationId: string;
  currentUserId: string;
  initialMessages: Message[];
}

export function MessageThread({
  conversationId,
  currentUserId,
  initialMessages,
}: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Scroll to bottom whenever messages change
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Supabase Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            // Deduplicate — our own optimistic messages share the same id
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, supabase]);

  // Mark unread messages as read when this thread mounts
  useEffect(() => {
    const unreadIds = initialMessages
      .filter((m) => m.sender_id !== currentUserId && !m.read_at)
      .map((m) => m.id);

    if (unreadIds.length === 0) return;

    supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .in('id', unreadIds)
      .then(() => {}); // fire and forget
  }, [initialMessages, currentUserId, supabase]);

  const sendMessage = async () => {
    const trimmed = body.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setBody('');

    // Optimistic insert
    const optimisticId = crypto.randomUUID();
    const optimisticMsg: Message = {
      id: optimisticId,
      conversation_id: conversationId,
      sender_id: currentUserId,
      body: trimmed,
      read_at: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      body: trimmed,
    });

    if (error) {
      // Rollback optimistic message
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setBody(trimmed);
      toast.error('Failed to send message. Try again.');
    }

    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Group messages by sender for display
  const groupedMessages = messages.map((msg, idx) => ({
    ...msg,
    isFirst:
      idx === 0 || messages[idx - 1].sender_id !== msg.sender_id,
    isLast:
      idx === messages.length - 1 ||
      messages[idx + 1].sender_id !== msg.sender_id,
  }));

  return (
    <div className="flex flex-col h-full">
      {/* Messages scroll area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {groupedMessages.length === 0 && (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-muted-foreground">
              Start the conversation below.
            </p>
          </div>
        )}

        {groupedMessages.map((msg) => {
          const isOwn = msg.sender_id === currentUserId;

          return (
            <div
              key={msg.id}
              className={cn(
                'flex',
                isOwn ? 'justify-end' : 'justify-start',
                msg.isFirst && 'mt-4'
              )}
            >
              <div
                className={cn(
                  'max-w-[72%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                  isOwn
                    ? 'bg-um-blue text-white rounded-br-sm'
                    : 'bg-muted text-foreground rounded-bl-sm',
                  !msg.isLast && (isOwn ? 'rounded-br-2xl' : 'rounded-bl-2xl')
                )}
              >
                <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                {msg.isLast && (
                  <p
                    className={cn(
                      'text-[10px] mt-1',
                      isOwn ? 'text-white/60 text-right' : 'text-muted-foreground'
                    )}
                  >
                    {new Date(msg.created_at).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                    {isOwn && msg.read_at && ' · Seen'}
                  </p>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-border p-3 bg-background">
        <div className="flex items-end gap-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message… (Enter to send, Shift+Enter for newline)"
            rows={1}
            className="min-h-[40px] max-h-32 resize-none flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={!body.trim() || sending}
            size="icon"
            className="h-10 w-10 shrink-0 bg-um-blue text-white hover:bg-um-blue-light"
            aria-label="Send message"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
