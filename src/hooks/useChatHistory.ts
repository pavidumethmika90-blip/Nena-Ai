import {useCallback, useEffect, useState} from 'react';
import type {ChatMessage, ChatSession} from '../types/chat';

const STORAGE_KEY = 'my-ai-chats-v1';

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadSessions(): ChatSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is ChatSession =>
        s &&
        typeof s.id === 'string' &&
        typeof s.title === 'string' &&
        Array.isArray(s.messages),
    );
  } catch {
    return [];
  }
}

export function useChatHistory() {
  const [sessions, setSessions] = useState<ChatSession[]>(loadSessions);
  const [activeChatId, setActiveChatId] = useState<string | null>(() => {
    const initial = loadSessions();
    return initial.length > 0 ? initial[0].id : null;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch {
      // Ignore storage quota errors
    }
  }, [sessions]);

  const activeChat = sessions.find((s) => s.id === activeChatId) ?? null;

  const createNewChat = useCallback((): string => {
    // If current active chat already has 0 messages, keep using it
    if (activeChat && activeChat.messages.length === 0) {
      return activeChat.id;
    }
    const now = Date.now();
    const newSession: ChatSession = {
      id: createId(),
      title: 'New chat',
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveChatId(newSession.id);
    return newSession.id;
  }, [activeChat]);

  const ensureActiveChat = useCallback((): string => {
    if (activeChatId && sessions.some((s) => s.id === activeChatId)) {
      return activeChatId;
    }
    const now = Date.now();
    const newSession: ChatSession = {
      id: createId(),
      title: 'New chat',
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveChatId(newSession.id);
    return newSession.id;
  }, [activeChatId, sessions]);

  const selectChat = useCallback((chatId: string) => {
    setActiveChatId(chatId);
  }, []);

  const deleteChat = useCallback(
    (chatId: string) => {
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== chatId);
        if (activeChatId === chatId) {
          setActiveChatId(next.length > 0 ? next[0].id : null);
        }
        return next;
      });
    },
    [activeChatId],
  );

  const clearAllChats = useCallback(() => {
    setSessions([]);
    setActiveChatId(null);
  }, []);

  const updateChatTitle = useCallback((chatId: string, title: string) => {
    const cleaned = title.trim();
    if (!cleaned) return;
    setSessions((prev) =>
      prev.map((s) => (s.id === chatId ? {...s, title: cleaned} : s)),
    );
  }, []);

  const appendMessages = useCallback((chatId: string, newMessages: ChatMessage[]) => {
    const now = Date.now();
    setSessions((prev) => {
      const updated = prev.map((s) =>
        s.id === chatId
          ? {
              ...s,
              messages: [...s.messages, ...newMessages],
              updatedAt: now,
            }
          : s,
      );
      return updated.sort((a, b) => b.updatedAt - a.updatedAt);
    });
  }, []);

  const updateMessage = useCallback(
    (chatId: string, messageId: string, patch: Partial<ChatMessage>) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === chatId
            ? {
                ...s,
                updatedAt: Date.now(),
                messages: s.messages.map((m) =>
                  m.id === messageId ? {...m, ...patch} : m,
                ),
              }
            : s,
        ),
      );
    },
    [],
  );

  const truncateFromMessage = useCallback((chatId: string, messageId: string) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== chatId) return s;
        const idx = s.messages.findIndex((m) => m.id === messageId);
        if (idx === -1) return s;
        return {
          ...s,
          messages: s.messages.slice(0, idx),
        };
      }),
    );
  }, []);

  return {
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
  };
}
