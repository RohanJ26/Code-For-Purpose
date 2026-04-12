'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { SendHorizontal, Upload, Loader, Sparkles } from 'lucide-react';
import { VoiceInput } from './voice-input';
import { MessageSpeechButton } from './message-speech-button';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  onSendMessage: (
    message: string,
    onResponse?: (response: string, followUpQuestions?: string[]) => void
  ) => Promise<void>;
  isLoading?: boolean;
  datasetId?: string | null;
  suggestedQuestions?: string[];
  onCompareDatasets?: () => void;
  onGenerateReport?: () => void;
}

export function ChatInterface({
  onSendMessage,
  isLoading = false,
  datasetId,
  suggestedQuestions = [],
  onCompareDatasets,
  onGenerateReport,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') window.speechSynthesis.cancel();
    };
  }, []);

  const submitChat = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text || sending || isLoading || !datasetId) return;

      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: text,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setFollowUpQuestions([]);
      setInput('');
      setSending(true);

      const assistantMessageId = (Date.now() + 1).toString();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '⏳ Processing your request...',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      try {
        await onSendMessage(text, (response: string, nextFollowUps?: string[]) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId ? { ...msg, content: response } : msg
            )
          );
          if (nextFollowUps && nextFollowUps.length > 0) {
            setFollowUpQuestions(nextFollowUps.slice(0, 3));
          }
        });
      } catch (error) {
        console.error('Error sending message:', error);

        let errorContent = 'Sorry, there was an error processing your request.';
        if (error instanceof Error) {
          const m = error.message;
          const ml = m.toLowerCase();
          const quotaLike =
            ml.includes('quota exceeded') ||
            ml.includes('resource exhausted') ||
            ml.includes('rate limit') ||
            ml.includes('too many requests') ||
            ml.includes('http 429') ||
            /\bstatus\s*429\b/i.test(m);
          if (quotaLike) {
            errorContent =
              'API quota exceeded. The free tier has daily limits. Wait a few minutes or adjust limits at https://aistudio.google.com/app/apikey';
          } else if (m.length > 0) {
            errorContent = m.length <= 800 ? m : `${m.slice(0, 800)}...`;
          }
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId ? { ...msg, content: errorContent } : msg
          )
        );
      } finally {
        setSending(false);
      }
    },
    [datasetId, isLoading, onSendMessage, sending]
  );

  const handleSendMessage = () => {
    void submitChat(input);
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          datasetId && suggestedQuestions.length > 0 ? (
            <div className="shrink-0 max-h-[7.5rem] overflow-hidden py-1">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                  Suggested questions
                </div>
                <div className="flex flex-wrap gap-1.5 content-start">
                  {suggestedQuestions.map((q, i) => (
                    <Button
                      key={`empty-sq-${i}-${q.slice(0, 24)}`}
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-auto max-w-full whitespace-normal text-left text-[11px] leading-snug rounded-full px-2.5 py-1"
                      disabled={sending || isLoading}
                      onClick={() => void submitChat(q)}
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[200px]">
              <p className="text-center text-muted-foreground text-sm">
                {!datasetId
                  ? 'Upload your data to get started'
                  : 'Use the input below to ask about your data.'}
              </p>
            </div>
          )
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              } animate-in fade-in slide-in-from-bottom-2`}
            >
              <Card
                className={`max-w-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-none'
                    : 'bg-card border border-border rounded-2xl rounded-tl-none'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <div className="flex items-center justify-between gap-2 mt-2">
                  <p
                    className={`text-xs ${
                      message.role === 'user'
                        ? 'text-primary-foreground/70'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  <MessageSpeechButton
                    text={message.content}
                    messageId={message.id}
                    speakingId={speakingId}
                    setSpeakingId={setSpeakingId}
                    variant={message.role === 'user' ? 'onPrimary' : 'default'}
                  />
                </div>
              </Card>
            </div>
          ))
        )}
        {sending && (
          <div className="flex justify-start">
            <Card className="bg-card border border-border rounded-2xl rounded-tl-none px-4 py-3">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
              </div>
            </Card>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-border p-6 bg-background space-y-4">
        {datasetId && messages.length > 0 && followUpQuestions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Follow-up questions
            </div>
            <div className="flex flex-wrap gap-2">
              {followUpQuestions.map((q, i) => (
                <Button
                  key={`fu-${i}-${q.slice(0, 24)}`}
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-auto max-w-full whitespace-normal text-left text-xs rounded-full px-3 py-2"
                  disabled={sending || isLoading}
                  onClick={() => void submitChat(q)}
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Ask a question about your data..."
            disabled={sending || isLoading}
            className="flex-1 rounded-full bg-input"
          />
          <VoiceInput
            onTranscript={(text) => setInput(text)}
            disabled={sending || isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!input.trim() || sending || isLoading}
            size="icon"
            className="rounded-full w-10 h-10"
          >
            {sending || isLoading ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <SendHorizontal className="w-4 h-4" />
            )}
          </Button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={!datasetId || sending || isLoading || !onCompareDatasets}
            onClick={() => onCompareDatasets?.()}
          >
            <Upload className="w-3 h-3 mr-2" />
            Compare Datasets
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={!datasetId || sending || isLoading || !onGenerateReport}
            onClick={() => onGenerateReport?.()}
          >
            Generate Report
          </Button>
        </div>
      </div>
    </div>
  );
}
