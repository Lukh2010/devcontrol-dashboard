function resolveStoredPanel(defaultPanel) {
  try {
    const storedPanel = typeof window !== 'undefined' && window?.localStorage ? window.localStorage.getItem(PANEL_STORAGE_KEY) : null;
    if (storedPanel && PANEL_IDS.has(storedPanel)) {
      return storedPanel;
    }
  } catch (e) {
    // Ignore storage access errors
  }

  return PANEL_IDS.has(defaultPanel) ? defaultPanel : 'overview';
}