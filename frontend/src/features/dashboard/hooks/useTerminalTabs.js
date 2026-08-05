import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_TABS = 4;
const TABS_STORAGE_KEY = 'devcontrol_terminal_tabs';
const ACTIVE_TAB_STORAGE_KEY = 'devcontrol_terminal_active_tab';

function generateTabId() {
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function makeTab(displayNumber, id = null) {
  return {
    id: id || generateTabId(),
    title: `Terminal ${displayNumber}`
  };
}

function readStoredTabs() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(TABS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ensure all tabs have stable string IDs and correct titles
          const validated = parsed
            .slice(0, MAX_TABS)
            .filter((t) => t && typeof t.id === 'string' && t.id.length > 0);
          if (validated.length > 0) {
            // Fix titles to be sequential
            return validated.map((t, idx) => ({ ...t, title: `Terminal ${idx + 1}` }));
          }
        }
      }
    }
  } catch {
    // Ignore storage read error
  }
  return [makeTab(1)];
}

function readStoredActiveTab(defaultTabId, validTabs) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
      if (stored && validTabs.some((t) => t.id === stored)) {
        return stored;
      }
    }
  } catch {
    // Ignore storage read error
  }
  return defaultTabId;
}

export function useTerminalTabs() {
  const [tabs, setTabs] = useState(() => readStoredTabs());
  const [activeTabId, setActiveTabId] = useState(() => readStoredActiveTab(tabs[0]?.id || '', tabs));

  // Keep a ref to avoid stale closure issues in closeTab
  const tabsRef = useRef(tabs);
  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(tabs));
        window.localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTabId);
      }
    } catch {
      // Ignore storage write error
    }
  }, [tabs, activeTabId]);

  const addTab = useCallback(() => {
    setTabs((prev) => {
      if (prev.length >= MAX_TABS) {
        return prev;
      }
      const newTab = makeTab(prev.length + 1);
      setActiveTabId(newTab.id);
      return [...prev, newTab];
    });
  }, []);

  const closeTab = useCallback((tabIdToClose) => {
    setTabs((prev) => {
      if (prev.length <= 1) {
        return prev;
      }

      const closedIndex = prev.findIndex((t) => t.id === tabIdToClose);
      if (closedIndex === -1) {
        return prev;
      }

      const nextTabs = prev
        .filter((t) => t.id !== tabIdToClose)
        .map((t, idx) => ({ ...t, title: `Terminal ${idx + 1}` }));

      // Clean up localStorage for deleted tab
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(`devcontrol_terminal_output_${tabIdToClose}`);
          window.localStorage.removeItem(`devcontrol_terminal_history_${tabIdToClose}`);
        }
      } catch {
        // Ignore storage error
      }

      if (activeTabId === tabIdToClose) {
        const newActiveIndex = Math.max(0, closedIndex - 1);
        setActiveTabId(nextTabs[newActiveIndex]?.id || nextTabs[0]?.id);
      }

      return nextTabs;
    });
  }, [activeTabId]);

  return {
    tabs,
    activeTabId,
    setActiveTabId,
    addTab,
    closeTab,
    canAddTab: tabs.length < MAX_TABS
  };
}
