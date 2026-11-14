import React, {useState} from 'react';
import {AlertCircle, Check, Copy, RotateCcw} from 'lucide-react';
import type {ChatMessage as ChatMessageType} from '../types/chat';
import {MarkdownRenderer} from './MarkdownRenderer';

interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming?: boolean;
  isLatestAssistant?: boolean;
  onRegenerate?: () => void;
  onRetry?: () => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isStreaming = false,
  isLatestAssistant = false,
  onRegenerate,
  onRetry,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failures
    }
  };

  if (message.role === 'user') {
    return (
      <div className="flex justify-end px-4 sm:px-6">
        <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl bg-slate-100 dark:bg-slate-800 px-4 py-3 text-[15px] leading-[1.7] text-slate-900 dark:text-slate-100 whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="group px-4 sm:px-6">
      <div className="flex items-start gap-3 sm:gap-4">
        <div
          aria-hidden="true"
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white"
        >
          AI
        </div>

        <div className="min-w-0 flex-1">
          {message.error ? (
            <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-3.5 text-sm text-red-800 dark:text-red-200">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                <div className="flex-1">
                  <p className="leading-relaxed">{message.content}</p>
                  {onRetry && (
                    <button
                      type="button"
                      onClick={onRetry}
                      className="mt-2.5 inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-red-300 dark:border-red-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 transition-colors hover:bg-red-50 dark:hover:bg-red-950/60"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Retry</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {message.content ? (
                <div className="relative">
                  <MarkdownRenderer content={message.content} />
                  {isStreaming && (
                    <span
                      aria-hidden="true"
                      className="ml-1 inline-block h-4 w-1.5 translate-y-0.5 bg-teal-600 dark:bg-teal-400 animate-pulse"
                    />
                  )}
                </div>
              ) : isStreaming ? (
                <div
                  className="flex items-center gap-1.5 py-2"
                  aria-label="Nena AI is thinking"
                >
                  <span className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce" />
                </div>
              ) : null}

              {!isStreaming && message.content && (
                <div className="mt-2 flex items-center gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={handleCopy}
                    aria-label="Copy response"
                    className="inline-flex min-h-[36px] min-w-[36px] items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-teal-500"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  {isLatestAssistant && onRegenerate && (
                    <button
                      type="button"
                      onClick={onRegenerate}
                      aria-label="Regenerate response"
                      className="inline-flex min-h-[36px] min-w-[36px] items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-teal-500"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Regenerate</span>
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
