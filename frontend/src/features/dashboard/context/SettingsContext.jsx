import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export const SETTINGS_STORAGE_KEY = 'devcontrol.settings.v1';

export const DEFAULT_SETTINGS = {
  refreshInterval: 'realtime',
  defaultPanel: 'overview',
  compactMode: false,
  reducedAnimations: false,
  theme: 'dark',
  accentColor: 'teal',
  fontScale: 'normal',
  terminalAutoScroll: true,
  terminalClearOnReconnect: false,
  terminalConfirmDangerous: true,
  terminalFontSize: 'normal',
  terminalShowTimestamps: false,
  sensitiveTelemetryMasking: true,
  confirmDangerousActions: true,
  hideSensitiveNetworkInfo: true,
  lockSensitiveTabsOnStartup: true,
  overviewLayout: 'balanced',
  showAdvancedPanels: true,
  showLiveStatsGraphs: true,
  autoOpenLastVisitedTab: false
};

export const REFRESH_INTERVALS = {
  realtime: 500,
  '1s': 1000,
  '2s': 2000,
  '5s': 5000,
  '10s': 10000
};

const VALID_VALUES = {
  refreshInterval: Object.keys(REFRESH_INTERVALS),
  defaultPanel: ['overview', 'ports', 'process-manager', 'commands', 'network', 'encryptions', 'settings'],
  theme: ['dark', 'light', 'system'],
  accentColor: ['teal', 'blue', 'green', 'violet', 'amber'],
  fontScale: ['small', 'normal', 'large'],
  terminalFontSize: ['small', 'normal', 'large'],
  overviewLayout: ['balanced', 'compact', 'ops']
};

const SettingsContext = createContext(null);

function normalizeSettings(value) {
  const nextSettings = { ...DEFAULT_SETTINGS, ...(value && typeof value === 'object' ? value : {}) };

  Object.entries(VALID_VALUES).forEach(([key, values]) => {
    if (!values.includes(nextSettings[key])) {
      nextSettings[key] = DEFAULT_SETTINGS[key];
    }
  });

  Object.entries(DEFAULT_SETTINGS).forEach(([key, defaultValue]) => {
    if (typeof defaultValue === 'boolean' && typeof nextSettings[key] !== 'boolean') {
      nextSettings[key] = defaultValue;
    }
  });

  return nextSettings;
}

function readStoredSettings() {
  try {
    const rawSettings = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!rawSettings) {
      return DEFAULT_SETTINGS;
    }

    return normalizeSettings(JSON.parse(rawSettings));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function resolveTheme(theme) {
  if (theme !== 'system') {
    return theme;
  }

  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(readStoredSettings);
  const [lastSavedAt, setLastSavedAt] = useState(null);

  useEffect(() => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    setLastSavedAt(Date.now());
  }, [settings]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolveTheme(settings.theme);
    root.dataset.accent = settings.accentColor;
    root.dataset.fontScale = settings.fontScale;
    root.dataset.compact = settings.compactMode ? 'true' : 'false';
    root.dataset.reducedMotion = settings.reducedAnimations ? 'true' : 'false';
    root.dataset.terminalFontSize = settings.terminalFontSize;
  }, [
    settings.accentColor,
    settings.compactMode,
    settings.fontScale,
    settings.reducedAnimations,
    settings.terminalFontSize,
    settings.theme
  ]);

  const updateSetting = useCallback((key, value) => {
    setSettings((previous) => normalizeSettings({ ...previous, [key]: value }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const clearLocalPreferences = useCallback(() => {
    window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
    window.localStorage.removeItem('devcontrol.activePanel');
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const refreshIntervalMs = REFRESH_INTERVALS[settings.refreshInterval] ?? 0;

  const value = useMemo(() => ({
    settings,
    refreshIntervalMs,
    lastSavedAt,
    updateSetting,
    resetSettings,
    clearLocalPreferences
  }), [clearLocalPreferences, lastSavedAt, refreshIntervalMs, resetSettings, settings, updateSetting]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}
