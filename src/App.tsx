import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ArrowDown,
  ArrowUp,
  Menu,
  Moon,
  PanelLeftOpen,
  Square,
  SquarePen,
  Sun,
} from 'lucide-react';
import {ChatMessage} from './components/ChatMessage';
import {OfflineIndicator} from './components/PWAInstallButton';
import {Sidebar} from './components/Sidebar';
import {WelcomeScreen} from './components/WelcomeScreen';
import {useChatHistory} from './hooks/useChatHistory';
import {useTheme} from './hooks/useTheme';
import type {ChatMessage as ChatMessageType} from './types/chat';

export default function App() {
  const {theme, toggleTheme} = useTheme();
  const {
    sessions,
    activeChat,
    activeChatId,
    createNewChat,
    ensureActiveChat,
    selectChat,
    deleteChat,
    clearAllChats,
    updateChatTitle,
    appendMessages,
    updateMessage,
    truncateFromMessage,
    createId,
  } = useChatHistory();

  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const shouldAutoScrollRef = useRef(true);

  const messages = activeChat?.messages ?? [];

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({top: el.scrollHeight, behavior});
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom < 80;
    shouldAutoScrollRef.current = nearBottom;
    setShowScrollBottom(!nearBottom && messages.length > 0);
  }, [messages.length]);

  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      scrollToBottom('auto');
    }
  }, [messages, scrollToBottom]);

  useEffect(() => {
    setShowScrollBottom(false);
    shouldAutoScrollRef.current = true;
    scrollToBottom('auto');
  }, [activeChatId, scrollToBottom]);

  // Auto-resize textarea cleanly
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [input]);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const fetchChatTitle = useCallback(
    async (chatId: string, firstMessage: string) => {
      try {
        const res = await fetch('/api/chat/title', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({message: firstMessage}),
        });
        if (!res.ok) return;
        const data = (await res.json()) as {title?: string};
        if (data.title) {
          updateChatTitle(chatId, data.title);
        }
      } catch {
        // Fallback title already set
      }
    },
    [updateChatTitle],
  );

  const streamAssistantReply = useCallback(
    async (
      chatId: string,
      conversationMessages: Array<{role: 'user' | 'assistant'; content: string}>,
      assistantMsgId: string,
    ) => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setIsStreaming(true);
      shouldAutoScrollRef.current = true;

      let accumulated = '';

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({messages: conversationMessages}),
          signal: controller.signal,
        });

        if (!response.ok) {
          let errMsg = 'Unable to get a response. Please try again.';
          try {
            const errJson = (await response.json()) as {error?: string};
            if (errJson.error) errMsg = errJson.error;
          } catch {
            // Keep default message
          }
          updateMessage(chatId, assistantMsgId, {
            content: errMsg,
            error: true,
          });
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Streaming response body unavailable.');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const {done, value} = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, {stream: true});
          const events = buffer.split('\n\n');
          buffer = events.pop() ?? '';

          for (const event of events) {
            const lines = event.split('\n');
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const jsonStr = line.slice(6).trim();
              if (!jsonStr) continue;
              try {
                const payload = JSON.parse(jsonStr) as {
                  text?: string;
                  error?: string;
                  done?: boolean;
                };
                if (payload.error) {
                  updateMessage(chatId, assistantMsgId, {
                    content: payload.error,
                    error: true,
                  });
                  return;
                }
                if (payload.text) {
                  accumulated += payload.text;
                  updateMessage(chatId, assistantMsgId, {
                    content: accumulated,
                    error: false,
                  });
                }
              } catch {
                // Ignore malformed partial JSON chunk
              }
            }
          }
        }

        if (!accumulated.trim()) {
          updateMessage(chatId, assistantMsgId, {
            content: 'No response was generated. Please try asking again.',
            error: true,
          });
        }
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') {
          if (!accumulated.trim()) {
            updateMessage(chatId, assistantMsgId, {
              content: 'Generation stopped.',
              error: false,
            });
          }
          return;
        }
        updateMessage(chatId, assistantMsgId, {
          content:
            'Connection lost while waiting for Nena AI. Check your internet connection and retry.',
          error: true,
        });
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
        setIsStreaming(false);
      }
    },
    [updateMessage],
  );

  const sendMessage = useCallback(
    async (rawText?: string) => {
      const text = (rawText ?? input).trim();
      if (!text || isStreaming) return;

      const chatId = ensureActiveChat();
      const existingChat = sessions.find((s) => s.id === chatId);
      const priorMessages = existingChat?.messages ?? [];
      const isFirstMessage = priorMessages.length === 0;

      if (!rawText) {
        setInput('');
      }

      const now = Date.now();
      const userMsg: ChatMessageType = {
        id: createId(),
        role: 'user',
        content: text,
        createdAt: now,
      };
      const assistantMsg: ChatMessageType = {
        id: createId(),
        role: 'assistant',
        content: '',
        createdAt: now + 1,
      };

      if (isFirstMessage) {
        updateChatTitle(chatId, text.slice(0, 42));
      }

      appendMessages(chatId, [userMsg, assistantMsg]);

      const payloadHistory = [...priorMessages, userMsg]
        .filter((m) => !m.error && m.content.trim().length > 0)
        .map((m) => ({role: m.role, content: m.content}));

      if (isFirstMessage) {
        void fetchChatTitle(chatId, text);
      }

      await streamAssistantReply(chatId, payloadHistory, assistantMsg.id);
    },
    [
      appendMessages,
      createId,
      ensureActiveChat,
      fetchChatTitle,
      input,
      isStreaming,
      sessions,
      streamAssistantReply,
      updateChatTitle,
    ],
  );

  const handleRegenerate = useCallback(
    async (assistantMsgId: string) => {
      if (!activeChat || isStreaming) return;
      const idx = activeChat.messages.findIndex((m) => m.id === assistantMsgId);
      if (idx === -1) return;

      const contextMessages = activeChat.messages
        .slice(0, idx)
        .filter((m) => !m.error && m.content.trim().length > 0);

      if (contextMessages.length === 0) return;

      truncateFromMessage(activeChat.id, assistantMsgId);
      const newAssistantId = createId();
      appendMessages(activeChat.id, [
        {
          id: newAssistantId,
          role: 'assistant',
          content: '',
          createdAt: Date.now(),
        },
      ]);

      await streamAssistantReply(
        activeChat.id,
        contextMessages.map((m) => ({role: m.role, content: m.content})),
        newAssistantId,
      );
    },
    [
      activeChat,
      appendMessages,
      createId,
      isStreaming,
      streamAssistantReply,
      truncateFromMessage,
    ],
  );

  const handleNewChat = useCallback(() => {
    if (isStreaming) {
      stopGeneration();
    }
    createNewChat();
    setInput('');
    textareaRef.current?.focus();
  }, [createNewChat, isStreaming, stopGeneration]);

  const handleSelectChat = useCallback(
    (id: string) => {
      if (isStreaming) {
        stopGeneration();
      }
      selectChat(id);
    },
    [isStreaming, selectChat, stopGeneration],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      e.key === 'Enter' &&
      !e.shiftKey &&
      !e.nativeEvent.isComposing &&
      window.innerWidth >= 768
    ) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const latestAssistantId = [...messages]
    .reverse()
    .find((m) => m.role === 'assistant')?.id;

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100">
      <Sidebar
        sessions={sessions}
        activeChatId={activeChatId}
        isOpenMobile={isMobileSidebarOpen}
        isCollapsedDesktop={isDesktopSidebarCollapsed}
        theme={theme}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onToggleCollapseDesktop={() => setIsDesktopSidebarCollapsed(true)}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={deleteChat}
        onClearAll={clearAllChats}
        onToggleTheme={toggleTheme}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#0b0f17]/90 px-2 sm:px-4 backdrop-blur-md pt-safe">
          <div className="flex min-w-0 items-center gap-1.5">
            {/* Mobile drawer toggle */}
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              aria-label="Open chat history"
              className="flex md:hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Desktop collapsed sidebar reopen */}
            {isDesktopSidebarCollapsed && (
              <>
                <button
                  type="button"
                  onClick={() => setIsDesktopSidebarCollapsed(false)}
                  aria-label="Open sidebar"
                  className="hidden md:flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <PanelLeftOpen className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={handleNewChat}
                  aria-label="New chat"
                  className="hidden md:flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <SquarePen className="h-5 w-5" />
                </button>
              </>
            )}

            <span className="truncate text-base font-semibold tracking-tight text-slate-900 dark:text-white px-1">
              {activeChat && activeChat.messages.length > 0
                ? activeChat.title
                : 'Nena AI'}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5 text-amber-400" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>

            <button
              type="button"
              onClick={handleNewChat}
              aria-label="New chat"
              className="flex md:hidden h-11 w-11 items-center justify-center rounded-xl text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <SquarePen className="h-5 w-5" />
            </button>
          </div>
        </header>

        <OfflineIndicator />

        {/* Chat Viewport */}
        <main className="relative flex-1 overflow-hidden">
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="chat-scroll h-full overflow-y-auto overscroll-contain"
          >
            {messages.length === 0 ? (
              <WelcomeScreen onSelectPrompt={(p) => void sendMessage(p)} />
            ) : (
              <div className="mx-auto w-full max-w-3xl space-y-6 py-5 sm:py-8">
                {messages.map((msg) => {
                  const isThisStreaming =
                    isStreaming && msg.id === latestAssistantId;
                  return (
                    <ChatMessage
                      key={msg.id}
                      message={msg}
                      isStreaming={isThisStreaming}
                      isLatestAssistant={msg.id === latestAssistantId}
                      onRegenerate={() => void handleRegenerate(msg.id)}
                      onRetry={() => void handleRegenerate(msg.id)}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {showScrollBottom && (
            <button
              type="button"
              onClick={() => {
                shouldAutoScrollRef.current = true;
                scrollToBottom('smooth');
              }}
              aria-label="Scroll to latest message"
              className="absolute bottom-3 left-1/2 -translate-x-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-md transition-transform hover:scale-105"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
          )}
        </main>

        {/* Composer */}
        <footer className="shrink-0 bg-white dark:bg-[#0b0f17] px-3 pt-2 pb-safe sm:px-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (isStreaming) {
                stopGeneration();
              } else {
                void sendMessage();
              }
            }}
            className="mx-auto w-full max-w-3xl"
          >
            <div className="flex items-end gap-2 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-1.5 pl-3.5 shadow-xs focus-within:border-teal-600 dark:focus-within:border-teal-500 transition-colors">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                enterKeyHint="send"
                placeholder="Message Nena AI..."
                aria-label="Message Nena AI"
                className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent py-2 text-[15px] leading-relaxed text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none"
              />

              {isStreaming ? (
                <button
                  type="button"
                  onClick={stopGeneration}
                  aria-label="Stop generating"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 transition-opacity hover:opacity-90"
                >
                  <Square className="h-4 w-4 fill-current" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  aria-label="Send message"
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                    input.trim()
                      ? 'bg-teal-600 text-white hover:bg-teal-700 active:scale-[0.97]'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <ArrowUp className="h-5 w-5" />
                </button>
              )}
            </div>
            <p className="mt-1.5 text-center text-[11px] text-slate-500 dark:text-slate-400">
              Nena AI replies in Sinhala, English, and other languages automatically.
            </p>
          </form>
        </footer>
      </div>
    </div>
  );
}
