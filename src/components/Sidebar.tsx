import React, {useMemo, useState} from 'react';
import {
  MessageSquare,
  Moon,
  PanelLeftClose,
  Plus,
  Search,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import type {ChatSession, ThemeMode} from '../types/chat';
import {PWAInstallButton} from './PWAInstallButton';

interface SidebarProps {
  sessions: ChatSession[];
  activeChatId: string | null;
  isOpenMobile: boolean;
  isCollapsedDesktop: boolean;
  theme: ThemeMode;
  onCloseMobile: () => void;
  onToggleCollapseDesktop: () => void;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onClearAll: () => void;
  onToggleTheme: () => void;
}

function getDateBucket(timestamp: number): string {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86_400_000;
  const weekStart = todayStart - 7 * 86_400_000;

  if (timestamp >= todayStart) return 'Today';
  if (timestamp >= yesterdayStart) return 'Yesterday';
  if (timestamp >= weekStart) return 'Previous 7 days';
  return 'Older';
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  activeChatId,
  isOpenMobile,
  isCollapsedDesktop,
  theme,
  onCloseMobile,
  onToggleCollapseDesktop,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onClearAll,
  onToggleTheme,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const filteredSessions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.messages.some((m) => m.content.toLowerCase().includes(q)),
    );
  }, [sessions, searchQuery]);

  const groupedSessions = useMemo(() => {
    const groups: Record<string, ChatSession[]> = {};
    const order = ['Today', 'Yesterday', 'Previous 7 days', 'Older'];
    for (const s of filteredSessions) {
      const bucket = getDateBucket(s.updatedAt);
      if (!groups[bucket]) groups[bucket] = [];
      groups[bucket].push(s);
    }
    return order
      .filter((label) => groups[label]?.length)
      .map((label) => ({label, items: groups[label]}));
  }, [filteredSessions]);

  const sidebarContent = (
    <div className="flex h-full flex-col bg-slate-50 dark:bg-[#111827] text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2 pt-safe">
        <button
          type="button"
          onClick={() => {
            onNewChat();
            onCloseMobile();
          }}
          className="flex flex-1 min-h-[44px] items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/80 px-3.5 py-2 text-sm font-medium text-slate-900 dark:text-slate-100 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-teal-500"
        >
          <Plus className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
          <span className="truncate">New chat</span>
        </button>

        {/* Close mobile drawer */}
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close sidebar"
          className="flex md:hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Collapse desktop sidebar */}
        <button
          type="button"
          onClick={onToggleCollapseDesktop}
          aria-label="Collapse sidebar"
          className="hidden md:flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800"
        >
          <PanelLeftClose className="h-5 w-5" />
        </button>
      </div>

      {/* Search chats when user has history */}
      {sessions.length > 3 && (
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              aria-label="Search chat history"
              className="w-full min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* History List */}
      <div className="chat-scroll flex-1 overflow-y-auto px-2 py-2">
        {groupedSessions.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
            {searchQuery.trim()
              ? 'No matching chats found.'
              : 'Your conversations will appear here.'}
          </div>
        ) : (
          <div className="space-y-4">
            {groupedSessions.map((group) => (
              <div key={group.label}>
                <div className="px-3 pb-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  {group.label}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((session) => {
                    const isActive = session.id === activeChatId;
                    return (
                      <div
                        key={session.id}
                        className={`group flex min-h-[44px] items-center rounded-xl transition-colors ${
                          isActive
                            ? 'bg-slate-200/80 dark:bg-slate-800 text-slate-900 dark:text-white'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onSelectChat(session.id);
                            onCloseMobile();
                          }}
                          className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5 text-left text-sm"
                        >
                          <MessageSquare className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                          <span className="truncate font-medium">
                            {session.title || 'New chat'}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteChat(session.id);
                          }}
                          aria-label={`Delete ${session.title}`}
                          className={`mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-300/60 dark:hover:bg-slate-700 hover:text-red-600 dark:hover:text-red-400 ${
                            isActive
                              ? 'opacity-100'
                              : 'opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100'
                          }`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="border-t border-slate-200 dark:border-slate-800 p-2.5 space-y-1 pb-safe">
        <PWAInstallButton />

        <button
          type="button"
          onClick={onToggleTheme}
          className="flex w-full min-h-[44px] items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-200/60 dark:hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-teal-500"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="h-4 w-4 shrink-0 text-amber-400" />
              <span>Light mode</span>
            </>
          ) : (
            <>
              <Moon className="h-4 w-4 shrink-0 text-slate-600" />
              <span>Dark mode</span>
            </>
          )}
        </button>

        {sessions.length > 0 && (
          <div>
            {confirmClear ? (
              <div className="flex items-center gap-1.5 px-1 py-1">
                <button
                  type="button"
                  onClick={() => {
                    onClearAll();
                    setConfirmClear(false);
                  }}
                  className="flex-1 min-h-[40px] rounded-lg bg-red-600 px-3 text-xs font-medium text-white hover:bg-red-700"
                >
                  Confirm clear
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 px-3 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="flex w-full min-h-[44px] items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 transition-colors hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-red-600 dark:hover:text-red-400"
              >
                <Trash2 className="h-4 w-4 shrink-0" />
                <span>Clear history</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop persistent / collapsible sidebar */}
      <aside
        className={`hidden md:block shrink-0 transition-[width] duration-200 ease-out overflow-hidden ${
          isCollapsedDesktop ? 'w-0' : 'w-[280px]'
        }`}
      >
        <div className="h-full w-[280px]">{sidebarContent}</div>
      </aside>

      {/* Mobile slide-over drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            onClick={onCloseMobile}
            aria-hidden="true"
            className="fixed inset-0 bg-black/50 backdrop-blur-[1px]"
          />
          <aside className="relative z-10 h-full w-[82vw] max-w-[310px] shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
