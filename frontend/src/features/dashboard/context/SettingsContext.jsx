function readStoredSettings() {
  try {
    if (typeof window === 'undefined' || !window?.localStorage) {
      return DEFAULT_SETTINGS;
    }
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
    try {
      if (typeof window !== 'undefined' && window?.localStorage) {
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
        setLastSavedAt(Date.now());
      }
    } catch {
      // Ignore storage write errors
    }
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
    try {
      if (typeof window !== 'undefined' && window?.localStorage) {
        window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
        window.localStorage.removeItem('devcontrol.activePanel');
      }
    } catch {
      // Ignore storage removal errors
    }
    setSettings(DEFAULT_SETTINGS);
  }, []);