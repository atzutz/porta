import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import type { ConversationEntry } from "../hooks/useConversations";
import { api } from "../api/client";
import {
  IconPlus,
  IconSearch,
  IconX,
  IconSpinner,
  IconGear,
  IconFolder,
  IconAutoAwesome,
  IconArrowDropDown,
  IconMore,
} from "./Icons";
import { GlassMenu } from "./ui/GlassMenu";
import { GlassInput } from "./ui/GlassInput";

interface Props {
  conversations: ConversationEntry[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onSettings: () => void;
  loading: boolean;
  connected: boolean;
  isOpen: boolean;
  onClose?: () => void;
}

interface WorkspaceGroup {
  name: string;
  conversations: ConversationEntry[];
  hasRunning: boolean;
}

const PREVIEW_COUNT = 3;

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function extractWorkspaceName(conv: ConversationEntry): string {
  const ws = conv.summary.workspaces?.[0];
  if (!ws) return "Others";
  const repo = ws.repository?.computedName;
  if (repo) return repo.split("/").pop() ?? repo;
  const uri = ws.workspaceFolderAbsoluteUri;
  if (uri) return uri.split("/").pop() ?? "Others";
  return "Others";
}

function isArchived(conv: ConversationEntry): boolean {
  return conv.summary.status === "CASCADE_RUN_STATUS_UNLOADED";
}



export function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onSettings,
  loading,
  connected,
  isOpen,
  onClose,
}: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    | {
        id: string;
        title: string;
        snippets: string[];
        matchCount: number;
      }[]
    | null
  >(null);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const groups = useMemo<WorkspaceGroup[]>(() => {
    const map = new Map<string, ConversationEntry[]>();

    for (const conv of conversations) {
      const name = extractWorkspaceName(conv);
      const list = map.get(name) ?? [];
      list.push(conv);
      map.set(name, list);
    }

    return Array.from(map.entries())
      .filter(([name]) => name !== "Others") // Hide workspace-less conversations
      .map(([name, convs]) => {
        convs.sort((a, b) => {
          const aRunning = a.summary.status === "CASCADE_RUN_STATUS_RUNNING";
          const bRunning = b.summary.status === "CASCADE_RUN_STATUS_RUNNING";
          if (aRunning !== bRunning) return aRunning ? -1 : 1;
          return (
            new Date(b.summary.lastModifiedTime).getTime() -
            new Date(a.summary.lastModifiedTime).getTime()
          );
        });
        return {
          name,
          conversations: convs,
          hasRunning: convs.some(
            (c) => c.summary.status === "CASCADE_RUN_STATUS_RUNNING",
          ),
        };
      })
      .sort((a, b) => {
        const aHasActive = a.conversations.some((c) => !isArchived(c));
        const bHasActive = b.conversations.some((c) => !isArchived(c));
        if (aHasActive !== bHasActive) return aHasActive ? -1 : 1;
        if (a.hasRunning !== b.hasRunning) return a.hasRunning ? -1 : 1;
        const aTime = Math.max(
          ...a.conversations.map((c) =>
            new Date(c.summary.lastModifiedTime).getTime(),
          ),
        );
        const bTime = Math.max(
          ...b.conversations.map((c) =>
            new Date(c.summary.lastModifiedTime).getTime(),
          ),
        );
        return bTime - aTime;
      });
  }, [conversations]);

  const toggleGroup = (name: string) => {
    setCollapsed((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const toggleExpanded = (name: string) => {
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const handleSearchInput = useCallback((value: string) => {
    setSearchQuery(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);

    if (!value.trim()) {
      setSearchResults(null);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const data = await api.search(value.trim());
        setSearchResults(data.results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults(null);
    setSearching(false);
  }, []);

  const [seenAt, setSeenAt] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem("porta:seenAt") ?? "{}");
    } catch {
      return {};
    }
  });

  const markSeen = useCallback(
    (convId: string) => {
      const conv = conversations.find((c) => c.id === convId);
      if (!conv) return;
      setSeenAt((prev) => {
        const next = { ...prev, [convId]: conv.summary.lastModifiedTime };
        try {
          localStorage.setItem("porta:seenAt", JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    [conversations],
  );

  useEffect(() => {
    if (activeId) markSeen(activeId);
  }, [activeId, conversations, markSeen]);

  const renderItem = (conv: ConversationEntry) => {
    const isRunning = conv.summary.status === "CASCADE_RUN_STATUS_RUNNING";
    const lastSeen = seenAt[conv.id];
    const hasUpdates =
      !isRunning &&
      conv.id !== activeId &&
      !!lastSeen &&
      new Date(conv.summary.lastModifiedTime).getTime() >
        new Date(lastSeen).getTime();

    return (
      <div
        key={conv.id}
        className={`sidebar-item ${conv.id === activeId ? "active" : ""}`}
        onClick={() => {
          markSeen(conv.id);
          onSelect(conv.id);
        }}
      >
        <div className="sidebar-item-title">{conv.summary.summary}</div>
        <div className="sidebar-item-meta">
          {relativeTime(conv.summary.lastModifiedTime)}
          {" · "}
          {conv.summary.stepCount} steps
        </div>
        
        <div className="sidebar-item-right">
          {isRunning && <IconSpinner size={12} className="item-indicator" />}
          {hasUpdates && <span className="item-dot" />}
          <GlassMenu
            trigger={
              <button className="sidebar-item-menu-btn" title="More options">
                <IconMore size={12} />
              </button>
            }
            items={[
              {
                label: "Delete",
                danger: true,
                onClick: () => onDelete(conv.id)
              }
            ]}
          />
        </div>
      </div>
    );
  };

  return (
    <aside className={`sidebar ${isOpen ? "sidebar-open" : ""}`}>
      {/* Header */}
      <div className="sidebar-header" title={connected ? "Connected" : "Disconnected"}>
        <div className="sidebar-logo">
          <IconAutoAwesome size={18} />
        </div>
        <h1 className="sidebar-brand">Porta AI</h1>
        {onClose && (
          <button
            className="sidebar-mobile-close-btn"
            onClick={onClose}
            title="Close menu"
          >
            <IconX size={16} />
          </button>
        )}
      </div>

      {/* Main Tabs */}
      <div className="sidebar-main-tabs">
        <button className="sidebar-tab" onClick={onNew}>
          <IconPlus size={20} />
          <span>New Chat</span>
        </button>
        <button className="sidebar-tab active">
          <IconFolder size={20} />
          <span>Projects</span>
        </button>
        <button className="sidebar-tab" onClick={() => {
            setSearchOpen(true);
            setTimeout(() => searchInputRef.current?.focus(), 50);
        }}>
          <IconSearch size={20} />
          <span>Search</span>
        </button>
        <button className="sidebar-tab" onClick={onSettings}>
          <IconGear size={20} />
          <span>Settings</span>
        </button>
      </div>

      {/* History */}
      <div className="sidebar-history">
        {loading && conversations.length === 0 ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 20 }}>
            <IconSpinner size={24} />
          </div>
        ) : (
          groups.map((group) => {
            const totalCount = group.conversations.length;
            const isGroupCollapsed = collapsed[group.name] ?? false;
            const isExpanded = expanded[group.name] ?? false;
            const visibleItems = isExpanded
              ? group.conversations
              : group.conversations.slice(0, PREVIEW_COUNT);
            const hiddenCount = totalCount - PREVIEW_COUNT;

            return (
              <div key={group.name} className="workspace-group">
                <div 
                  className="workspace-group-header" 
                  onClick={() => toggleGroup(group.name)}
                >
                  <div className="workspace-group-title">
                    <IconArrowDropDown size={16} className={`transition-transform duration-200 ${isGroupCollapsed ? "-rotate-90" : ""}`} />
                    <span>{group.name}</span>
                  </div>
                  <span className="workspace-group-count">{totalCount}</span>
                </div>

                {!isGroupCollapsed && (
                  <div className="workspace-group-items">
                    {visibleItems.map(renderItem)}

                    {hiddenCount > 0 && (
                      <button
                        className="sidebar-tab"
                        onClick={() => toggleExpanded(group.name)}
                        style={{marginTop: 4}}
                      >
                        {isExpanded ? "Show less" : `Show all (${totalCount})`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>



      {/* Search Modal */}
      {searchOpen && (
        <div className="search-modal-overlay" onClick={closeSearch}>
          <div
            className="search-modal"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") closeSearch();
            }}
          >
            <div className="search-modal-header">
              <IconSearch size={16} className="search-modal-icon" />
              <GlassInput
                ref={searchInputRef}
                className="search-modal-input"
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                autoFocus
              />
              <button className="search-modal-close" onClick={closeSearch}>
                <IconX size={13} />
              </button>
            </div>
            <div className="search-modal-results">
              {searching ? (
                <div className="search-modal-status">
                  <IconSpinner size={24} />
                </div>
              ) : searchResults === null ? (
                <div className="search-modal-status">
                  Type to search across all conversations
                </div>
              ) : searchResults.length === 0 ? (
                <div className="search-modal-status">
                  No results for "{searchQuery}"
                </div>
              ) : (
                searchResults.map((result) => (
                  <button
                    key={result.id}
                    className="search-result-item"
                    onClick={() => {
                      onSelect(result.id);
                      closeSearch();
                    }}
                  >
                    <div className="search-result-title">{result.title}</div>
                    <div className="search-result-snippets">
                      {result.snippets.map((s, i) => (
                        <div key={i} className="search-result-snippet">
                          {s}
                        </div>
                      ))}
                    </div>
                    <div className="search-result-meta">
                      {result.matchCount} match
                      {result.matchCount !== 1 ? "es" : ""}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
