import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Award,
  Bot,
  ExternalLink,
  Layers,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
  X,
} from 'lucide-react';
import { useAuth, useWorkflow } from '../../hooks/useAppState';
import { ROUTES } from '../../routes/routes';
import { aiChatService } from '../../services/ai/aiChatService';
import { AiChatMessage } from '../../types/ai';
import { formatDateTime } from '../../utils/formatters';

export function AiDashboardChat() {
  const { user } = useAuth();
  const { batches, certificates } = useWorkflow();

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);

  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isSending, isOpen]);

  if (!user) return null;

  const suggestedQuestions = aiChatService.getSuggestedQuestions(user.role);

  const dispatchQuery = async (text: string, appendUserMessage = true) => {
    const clean = text.trim();
    if (!clean || isSending) return;

    if (appendUserMessage) {
      const userMsg: AiChatMessage = {
        id: `msg-u-${Date.now()}`,
        role: 'user',
        content: clean,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
    } else {
      // Remove previous failed assistant message when retrying
      setMessages((prev) =>
        prev.filter((m) => !(m.role === 'assistant' && m.failedQuery === clean))
      );
    }

    setInput('');
    setIsSending(true);

    try {
      const response = await aiChatService.sendMessage({
        message: clean,
        user,
        batches,
        certificates,
      });

      const assistantMsg: AiChatMessage = {
        id: `msg-a-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        timestamp: response.generatedAt,
        referencedBatches: response.referencedBatches,
        referencedCertificates: response.referencedCertificates,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: AiChatMessage = {
        id: `msg-err-${Date.now()}`,
        role: 'assistant',
        content:
          err instanceof Error
            ? err.message
            : 'Unable to reach the assistant service.',
        timestamp: new Date().toISOString(),
        failedQuery: clean,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void dispatchQuery(input, true);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-stone-50 dark:border-slate-700 dark:bg-[#161B22] dark:text-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
      >
        <MessageSquare className="h-4 w-4 text-[#0F294D] dark:text-teal-400" />
        <span>AI Assistant</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/45 dark:bg-black/65"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ai-chat-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div className="flex h-full w-full max-w-lg flex-col border-l border-stone-200 bg-white shadow-xl dark:border-slate-800 dark:bg-[#161B22]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4 dark:border-slate-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#0F294D] text-white dark:bg-teal-600">
                  <Bot className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3
                    id="ai-chat-title"
                    className="font-display text-sm font-bold text-slate-900 dark:text-slate-100 truncate"
                  >
                    CertiFlow AI Assistant
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    Scoped to {user.roleLabel} access
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close AI assistant"
                className="rounded-md p-1.5 text-slate-400 hover:bg-stone-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Suggested Prompts */}
            <div className="border-b border-stone-200 bg-stone-50 px-5 py-3 dark:border-slate-800 dark:bg-[#1C222B]">
              <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Suggested Questions
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {suggestedQuestions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    disabled={isSending}
                    onClick={() => void dispatchQuery(q, true)}
                    className="rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-left text-[11px] font-medium text-slate-700 hover:border-[#0F294D]/40 hover:bg-stone-100 disabled:opacity-60 dark:border-slate-700 dark:bg-[#161B22] dark:text-slate-200 dark:hover:border-teal-500/50 dark:hover:bg-slate-800 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {messages.length === 0 && (
                <div className="rounded-md border border-dashed border-stone-300 bg-stone-50/50 p-5 text-center text-xs text-slate-500 dark:border-slate-700 dark:bg-[#1C222B]/40 dark:text-slate-400">
                  Ask questions about batches, review queues, return remarks, or certificates visible to your {user.roleLabel} account.
                </div>
              )}

              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      isUser ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[90%] rounded-md px-3.5 py-2.5 text-xs leading-relaxed ${
                        isUser
                          ? 'bg-[#0F294D] text-white dark:bg-teal-600'
                          : msg.failedQuery
                            ? 'border border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300'
                            : 'border border-stone-200 bg-stone-50 text-slate-800 dark:border-slate-800 dark:bg-[#1C222B] dark:text-slate-200'
                      }`}
                    >
                      {msg.failedQuery ? (
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>{msg.content}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              void dispatchQuery(msg.failedQuery!, false)
                            }
                            className="inline-flex items-center gap-1 rounded border border-red-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-red-800 hover:bg-red-50 dark:border-red-800 dark:bg-[#161B22] dark:text-red-300"
                          >
                            <RefreshCw className="h-3 w-3" />
                            <span>Retry</span>
                          </button>
                        </div>
                      ) : (
                        <p className="whitespace-pre-line">{msg.content}</p>
                      )}

                      {/* Referenced Batches */}
                      {msg.referencedBatches &&
                        msg.referencedBatches.length > 0 && (
                          <div className="mt-3 border-t border-stone-200 pt-2.5 space-y-1.5 dark:border-slate-700">
                            <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                              Referenced Batches
                            </p>
                            {msg.referencedBatches.map((b) => (
                              <Link
                                key={b.id}
                                to={ROUTES.BATCH_DETAIL(b.id)}
                                onClick={() => setIsOpen(false)}
                                className="flex items-center justify-between gap-2 rounded border border-stone-200 bg-white px-2.5 py-1.5 hover:border-[#0F294D]/40 hover:bg-stone-50 dark:border-slate-700 dark:bg-[#161B22] dark:hover:border-teal-500/50 dark:hover:bg-slate-800 transition-colors"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <Layers className="h-3.5 w-3.5 shrink-0 text-[#0F294D] dark:text-teal-400" />
                                  <div className="min-w-0">
                                    <div className="font-mono text-[11px] font-semibold text-[#0F294D] dark:text-teal-400 tabular-nums">
                                      {b.batchNumber}
                                    </div>
                                    <div className="truncate text-[11px] text-slate-600 dark:text-slate-300">
                                      {b.batchName} · {b.status}
                                    </div>
                                  </div>
                                </div>
                                <ExternalLink className="h-3 w-3 shrink-0 text-slate-400" />
                              </Link>
                            ))}
                          </div>
                        )}

                      {/* Referenced Certificates (State Officer scope only) */}
                      {msg.referencedCertificates &&
                        msg.referencedCertificates.length > 0 &&
                        user.role === 'STATE_OFFICER' && (
                          <div className="mt-3 border-t border-stone-200 pt-2.5 space-y-1.5 dark:border-slate-700">
                            <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                              Referenced Certificates
                            </p>
                            {msg.referencedCertificates.map((c) => (
                              <Link
                                key={c.id}
                                to={ROUTES.CERTIFICATE_DETAIL(c.id)}
                                onClick={() => setIsOpen(false)}
                                className="flex items-center justify-between gap-2 rounded border border-stone-200 bg-white px-2.5 py-1.5 hover:border-[#0F294D]/40 hover:bg-stone-50 dark:border-slate-700 dark:bg-[#161B22] dark:hover:border-teal-500/50 dark:hover:bg-slate-800 transition-colors"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <Award className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-400" />
                                  <div className="min-w-0">
                                    <div className="font-mono text-[11px] font-semibold text-[#0F294D] dark:text-teal-400 tabular-nums">
                                      {c.certificateNumber}
                                    </div>
                                    <div className="truncate text-[11px] text-slate-600 dark:text-slate-300">
                                      {c.candidateName} · {c.status}
                                    </div>
                                  </div>
                                </div>
                                <ExternalLink className="h-3 w-3 shrink-0 text-slate-400" />
                              </Link>
                            ))}
                          </div>
                        )}
                    </div>
                    <span className="mt-1 font-mono text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">
                      {formatDateTime(msg.timestamp)}
                    </span>
                  </div>
                );
              })}

              {isSending && (
                <div className="flex items-start">
                  <div className="inline-flex items-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-[#1C222B] dark:text-slate-300">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#0F294D] dark:text-teal-400" />
                    <span>Checking authorized records...</span>
                  </div>
                </div>
              )}

              <div ref={endRef} />
            </div>

            {/* Composer */}
            <form
              onSubmit={handleSubmit}
              className="border-t border-stone-200 bg-white p-4 dark:border-slate-800 dark:bg-[#161B22]"
            >
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about batches, queues, or certificates..."
                  aria-label="Ask CertiFlow AI Assistant"
                  className="h-10 flex-1 rounded-md border border-stone-300 bg-white px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0F294D] focus:outline-none focus:ring-2 focus:ring-[#0F294D]/15 dark:border-slate-700 dark:bg-[#0D1016] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-500 dark:focus:ring-teal-500/20"
                />
                <button
                  type="submit"
                  disabled={isSending || !input.trim()}
                  className="inline-flex h-10 items-center gap-1.5 rounded-md bg-[#0F294D] px-4 text-xs font-semibold text-white hover:bg-[#173A69] disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500 transition-colors whitespace-nowrap shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
