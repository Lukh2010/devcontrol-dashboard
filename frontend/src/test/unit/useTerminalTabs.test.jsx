import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useTerminalTabs } from '../../features/dashboard/hooks/useTerminalTabs';

describe('useTerminalTabs Hook', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.clear === 'function') {
      window.localStorage.clear();
    }
  });

  it('initializes with a default terminal tab', () => {
    const { result } = renderHook(() => useTerminalTabs());
    expect(result.current.tabs).toHaveLength(1);
    expect(result.current.tabs[0].title).toBe('Terminal 1');
    expect(result.current.canAddTab).toBe(true);
  });

  it('allows adding tabs up to MAX_TABS limit (4)', () => {
    const { result } = renderHook(() => useTerminalTabs());

    act(() => {
      result.current.addTab();
      result.current.addTab();
      result.current.addTab();
    });

    expect(result.current.tabs).toHaveLength(4);
    expect(result.current.canAddTab).toBe(false);

    // Attempting to add a 5th tab should be blocked by MAX_TABS (4)
    act(() => {
      result.current.addTab();
    });

    expect(result.current.tabs).toHaveLength(4);
    expect(result.current.canAddTab).toBe(false);
  });

  it('re-enables tab addition when a tab is closed', () => {
    const { result } = renderHook(() => useTerminalTabs());

    act(() => {
      result.current.addTab();
      result.current.addTab();
      result.current.addTab();
    });

    expect(result.current.canAddTab).toBe(false);

    const tabToClose = result.current.tabs[1].id;
    act(() => {
      result.current.closeTab(tabToClose);
    });

    expect(result.current.tabs).toHaveLength(3);
    expect(result.current.canAddTab).toBe(true);
  });

  it('prevents closing the last remaining tab', () => {
    const { result } = renderHook(() => useTerminalTabs());
    const onlyTabId = result.current.tabs[0].id;

    act(() => {
      result.current.closeTab(onlyTabId);
    });

    expect(result.current.tabs).toHaveLength(1);
  });
});
