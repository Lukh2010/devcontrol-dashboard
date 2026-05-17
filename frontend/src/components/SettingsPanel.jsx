import React, { useMemo, useState } from 'react';
import { CheckCircle2, Download, Monitor, RotateCcw, Settings, ShieldCheck, SlidersHorizontal, Terminal, Trash2, Upload } from 'lucide-react';

import { DEFAULT_SETTINGS, useSettings } from '../features/dashboard/context/SettingsContext';

const CATEGORIES = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'appearance', label: 'Appearance', icon: Monitor },
  { id: 'terminal', label: 'Terminal', icon: Terminal },
  { id: 'privacy', label: 'Privacy/Security', icon: ShieldCheck },
  { id: 'behavior', label: 'Dashboard Behavior', icon: SlidersHorizontal }
];

const SELECT_OPTIONS = {
  refreshInterval: [
    ['realtime', 'Realtime'],
    ['1s', '1 second'],
    ['2s', '2 seconds'],
    ['5s', '5 seconds'],
    ['10s', '10 seconds']
  ],
  defaultPanel: [
    ['overview', 'Overview'],
    ['ports', 'Ports'],
    ['process-manager', 'Processes'],
    ['commands', 'Terminal'],
    ['network', 'Network'],
    ['encryptions', 'Encryptions'],
    ['settings', 'Settings']
  ],
  theme: [
    ['dark', 'Dark'],
    ['light', 'Light'],
    ['system', 'System']
  ],
  accentColor: [
    ['teal', 'Teal'],
    ['blue', 'Blue'],
    ['green', 'Green'],
    ['violet', 'Violet'],
    ['amber', 'Amber']
  ],
  fontScale: [
    ['small', 'Small'],
    ['normal', 'Normal'],
    ['large', 'Large']
  ],
  terminalFontSize: [
    ['small', 'Small'],
    ['normal', 'Normal'],
    ['large', 'Large']
  ],
  overviewLayout: [
    ['balanced', 'Balanced'],
    ['compact', 'Compact'],
    ['ops', 'Operations focused']
  ]
};

function SettingRow({ title, description, control }) {
  return (
    <div className="settings-row">
      <div>
        <div className="action-feed-title">{title}</div>
        <div className="muted-note">{description}</div>
      </div>
      <div className="settings-control">
        {control}
      </div>
    </div>
  );
}

function SelectSetting({ id, value, options, onChange }) {
  return (
    <select
      id={id}
      className="select"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map(([optionValue, label]) => (
        <option key={optionValue} value={optionValue}>{label}</option>
      ))}
    </select>
  );
}

function ToggleSetting({ id, checked, onChange }) {
  return (
    <label className="switch" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="switch-track" />
    </label>
  );
}

function SettingsPanel() {
  const {
    settings,
    lastSavedAt,
    updateSetting,
    resetSettings,
    clearLocalPreferences
  } = useSettings();
  const [activeCategory, setActiveCategory] = useState('general');
  const [importError, setImportError] = useState('');

  const savedLabel = useMemo(() => {
    if (!lastSavedAt) {
      return 'Ready';
    }

    return `Saved ${new Date(lastSavedAt).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })}`;
  }, [lastSavedAt]);

  const exportSettings = async () => {
    const payload = JSON.stringify(settings, null, 2);
    await navigator.clipboard.writeText(payload);
  };

  const importSettings = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        Object.entries({ ...DEFAULT_SETTINGS, ...parsed }).forEach(([key, value]) => {
          updateSetting(key, value);
        });
        setImportError('');
      } catch {
        setImportError('The selected settings file is not valid JSON.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const renderCategory = () => {
    if (activeCategory === 'general') {
      return (
        <div className="settings-card-stack">
          <section className="mini-card settings-card">
            <SettingRow
              title="Refresh interval"
              description="Controls local query refreshes. Realtime keeps the SSE stream as the primary live source."
              control={(
                <SelectSetting
                  id="settings-refresh-interval"
                  value={settings.refreshInterval}
                  options={SELECT_OPTIONS.refreshInterval}
                  onChange={(value) => updateSetting('refreshInterval', value)}
                />
              )}
            />
            <SettingRow
              title="Default startup page"
              description="Used when DevControl is not set to reopen the last visited tab."
              control={(
                <SelectSetting
                  id="settings-default-panel"
                  value={settings.defaultPanel}
                  options={SELECT_OPTIONS.defaultPanel}
                  onChange={(value) => updateSetting('defaultPanel', value)}
                />
              )}
            />
            <SettingRow
              title="Compact mode"
              description="Reduces card padding and navigation height for denser local monitoring."
              control={(
                <ToggleSetting
                  id="settings-compact-mode"
                  checked={settings.compactMode}
                  onChange={(value) => updateSetting('compactMode', value)}
                />
              )}
            />
            <SettingRow
              title="Reduced animations"
              description="Minimizes transitions in the dashboard UI."
              control={(
                <ToggleSetting
                  id="settings-reduced-animations"
                  checked={settings.reducedAnimations}
                  onChange={(value) => updateSetting('reducedAnimations', value)}
                />
              )}
            />
          </section>
        </div>
      );
    }

    if (activeCategory === 'appearance') {
      return (
        <div className="settings-card-stack">
          <section className="mini-card settings-card">
            <SettingRow
              title="Theme"
              description="Changes the local dashboard color scheme without contacting the backend."
              control={(
                <SelectSetting
                  id="settings-theme"
                  value={settings.theme}
                  options={SELECT_OPTIONS.theme}
                  onChange={(value) => updateSetting('theme', value)}
                />
              )}
            />
            <SettingRow
              title="Accent color"
              description="Applies a local accent to buttons, focus states and icons."
              control={(
                <SelectSetting
                  id="settings-accent-color"
                  value={settings.accentColor}
                  options={SELECT_OPTIONS.accentColor}
                  onChange={(value) => updateSetting('accentColor', value)}
                />
              )}
            />
            <SettingRow
              title="Font size"
              description="Scales dashboard text for readability."
              control={(
                <SelectSetting
                  id="settings-font-scale"
                  value={settings.fontScale}
                  options={SELECT_OPTIONS.fontScale}
                  onChange={(value) => updateSetting('fontScale', value)}
                />
              )}
            />
          </section>

          <section className="mini-card settings-preview">
            <div>
              <div className="action-feed-title">Live preview</div>
              <div className="muted-note">This preview uses the same local CSS variables as the dashboard.</div>
            </div>
            <div className="settings-preview-surface">
              <span className="status-badge status-success">Live</span>
              <p className="metric-reading compact-reading">DevControl</p>
              <button className="button" type="button">Primary Action</button>
            </div>
          </section>
        </div>
      );
    }

    if (activeCategory === 'terminal') {
      return (
        <div className="settings-card-stack">
          <section className="mini-card settings-card">
            <SettingRow
              title="Auto-scroll output"
              description="Keeps the latest terminal output visible."
              control={(
                <ToggleSetting
                  id="settings-terminal-autoscroll"
                  checked={settings.terminalAutoScroll}
                  onChange={(value) => updateSetting('terminalAutoScroll', value)}
                />
              )}
            />
            <SettingRow
              title="Clear on reconnect"
              description="Clears local terminal output when a fresh WebSocket session connects."
              control={(
                <ToggleSetting
                  id="settings-terminal-clear-reconnect"
                  checked={settings.terminalClearOnReconnect}
                  onChange={(value) => updateSetting('terminalClearOnReconnect', value)}
                />
              )}
            />
            <SettingRow
              title="Confirm dangerous commands"
              description="Keeps local confirmation prompts enabled. Backend command classification still enforces mandatory safety checks."
              control={(
                <ToggleSetting
                  id="settings-terminal-confirm"
                  checked={settings.terminalConfirmDangerous}
                  onChange={(value) => updateSetting('terminalConfirmDangerous', value)}
                />
              )}
            />
            <SettingRow
              title="Terminal font size"
              description="Changes only the visible terminal output and input size."
              control={(
                <SelectSetting
                  id="settings-terminal-font-size"
                  value={settings.terminalFontSize}
                  options={SELECT_OPTIONS.terminalFontSize}
                  onChange={(value) => updateSetting('terminalFontSize', value)}
                />
              )}
            />
            <SettingRow
              title="Show timestamps"
              description="Adds local timestamps to terminal output rows."
              control={(
                <ToggleSetting
                  id="settings-terminal-timestamps"
                  checked={settings.terminalShowTimestamps}
                  onChange={(value) => updateSetting('terminalShowTimestamps', value)}
                />
              )}
            />
          </section>
        </div>
      );
    }

    if (activeCategory === 'privacy') {
      return (
        <div className="settings-card-stack">
          <section className="mini-card settings-card">
            <SettingRow
              title="Sensitive telemetry masking"
              description="Keeps privacy-first UI defaults for command lines, paths and network details where the frontend can mask them."
              control={(
                <ToggleSetting
                  id="settings-telemetry-masking"
                  checked={settings.sensitiveTelemetryMasking}
                  onChange={(value) => updateSetting('sensitiveTelemetryMasking', value)}
                />
              )}
            />
            <SettingRow
              title="Confirm dangerous actions"
              description="Keeps confirmation dialogs enabled for process and port stop flows."
              control={(
                <ToggleSetting
                  id="settings-confirm-actions"
                  checked={settings.confirmDangerousActions}
                  onChange={(value) => updateSetting('confirmDangerousActions', value)}
                />
              )}
            />
            <SettingRow
              title="Hide sensitive network info"
              description="Starts network views in a privacy-first state until control access is unlocked."
              control={(
                <ToggleSetting
                  id="settings-hide-network"
                  checked={settings.hideSensitiveNetworkInfo}
                  onChange={(value) => updateSetting('hideSensitiveNetworkInfo', value)}
                />
              )}
            />
            <SettingRow
              title="Lock sensitive tabs on startup"
              description="Keeps sensitive local tools behind the normal control-session flow at startup."
              control={(
                <ToggleSetting
                  id="settings-lock-sensitive-tabs"
                  checked={settings.lockSensitiveTabsOnStartup}
                  onChange={(value) => updateSetting('lockSensitiveTabsOnStartup', value)}
                />
              )}
            />
          </section>

          <section className="mini-card settings-card">
            <div>
              <div className="action-feed-title">Local storage only</div>
              <div className="muted-note">This removes local UI preferences and the remembered tab. It does not store or clear passwords.</div>
            </div>
            <button className="danger-button" type="button" onClick={clearLocalPreferences}>
              <Trash2 size={16} />
              Clear local session/preferences
            </button>
          </section>
        </div>
      );
    }

    return (
      <div className="settings-card-stack">
        <section className="mini-card settings-card">
          <SettingRow
            title="Overview layout"
            description="Chooses the preferred layout density for the home dashboard."
            control={(
              <SelectSetting
                id="settings-overview-layout"
                value={settings.overviewLayout}
                options={SELECT_OPTIONS.overviewLayout}
                onChange={(value) => updateSetting('overviewLayout', value)}
              />
            )}
          />
          <SettingRow
            title="Show advanced panels"
            description="Keeps advanced cards available for process, port and terminal workflows."
            control={(
              <ToggleSetting
                id="settings-show-advanced"
                checked={settings.showAdvancedPanels}
                onChange={(value) => updateSetting('showAdvancedPanels', value)}
              />
            )}
          />
          <SettingRow
            title="Show live stats graphs"
            description="Keeps compact live-stat graph surfaces visible where available."
            control={(
              <ToggleSetting
                id="settings-show-graphs"
                checked={settings.showLiveStatsGraphs}
                onChange={(value) => updateSetting('showLiveStatsGraphs', value)}
              />
            )}
          />
          <SettingRow
            title="Auto-open last visited tab"
            description="When disabled, DevControl opens the selected default startup page."
            control={(
              <ToggleSetting
                id="settings-last-tab"
                checked={settings.autoOpenLastVisitedTab}
                onChange={(value) => updateSetting('autoOpenLastVisitedTab', value)}
              />
            )}
          />
        </section>
      </div>
    );
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <div className="panel-title-wrap">
          <span className="panel-icon">
            <Settings size={18} />
          </span>
          <div>
            <h2 className="panel-title">Settings</h2>
            <p className="panel-subtitle">Local user preferences for DevControl. Nothing here stores passwords or changes backend security.</p>
          </div>
        </div>
        <div className="chip-row">
          <span className="status-badge status-success">{savedLabel}</span>
          <button className="ghost-button compact-action-button" type="button" onClick={resetSettings}>
            <RotateCcw size={16} />
            Reset to Defaults
          </button>
        </div>
      </div>

      <div className="panel-body settings-layout">
        <aside className="settings-category-list" aria-label="Settings categories">
          {CATEGORIES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`settings-category-button ${activeCategory === id ? 'active' : ''}`}
              onClick={() => setActiveCategory(id)}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}

          <div className="settings-utility-card">
            <button className="ghost-button" type="button" onClick={() => { void exportSettings(); }}>
              <Download size={16} />
              Export JSON
            </button>
            <label className="ghost-button settings-import-button" htmlFor="settings-import">
              <Upload size={16} />
              Import JSON
              <input id="settings-import" type="file" accept="application/json" onChange={importSettings} />
            </label>
            {importError ? <div className="alert error compact-alert">{importError}</div> : null}
          </div>
        </aside>

        <main className="settings-main">
          <div className="glass-note settings-security-note">
            <span className="status-badge status-neutral">Local only</span>
            <p>
              Settings are saved in this browser only. Passwords, private keys and control sessions are not written to preferences.
            </p>
            <CheckCircle2 size={18} />
          </div>
          {renderCategory()}
        </main>
      </div>
    </section>
  );
}

export default SettingsPanel;
