import React from 'react';
import { ArrowUpRight, Cpu, HardDrive, LockKeyhole, Shield } from 'lucide-react';

function formatBytesToGb(value) {
  if (!value) {
    return '...';
  }

  return `${Math.round(value / 1024 / 1024 / 1024)} GB`;
}

function ControlAccessPanel({
  authBadge,
  authHint,
  authUnlocked,
  createAuthSessionMutation,
  currentStats,
  deleteAuthSessionMutation,
  passwordInput,
  passwordProtectionEnabled,
  setPasswordInput,
  streamError,
  unlockControl,
  lockControl
}) {
  const quickStats = [
    {
      label: 'Host',
      value: currentStats.systemInfo?.hostname || 'Loading',
      hint: currentStats.systemInfo?.platform || 'Waiting',
      icon: Shield
    },
    {
      label: 'Memory',
      value: formatBytesToGb(currentStats.systemInfo?.memory_total),
      hint: currentStats.performanceData ? `${Math.round(currentStats.performanceData.memory.percent)}% used` : 'Waiting',
      icon: HardDrive
    },
    {
      label: 'Processes',
      value: String(currentStats.processes?.length || 0),
      hint: currentStats.processes?.[0] ? currentStats.processes[0].name : 'No sample',
      icon: Cpu
    },
    {
      label: 'Ports',
      value: String(currentStats.ports?.length || 0),
      hint: currentStats.networkInfo?.default_gateway || 'No gateway',
      icon: ArrowUpRight
    }
  ];

  return (
    <section className="panel control-panel">
      <div className="panel-header compact-header">
        <div className="panel-title-wrap">
          <span className="panel-icon">
            <LockKeyhole size={18} />
          </span>
          <div>
            <h2 className="panel-title">Control access</h2>
            <p className="panel-subtitle">Unlock once, then use the same control session everywhere.</p>
          </div>
        </div>
      </div>

      <div className="panel-body stack">
        {passwordProtectionEnabled ? (
          <div className="unlock-form">
            <label className="field-label" htmlFor="control-password">Control Password</label>
            <input
              id="control-password"
              className="input"
              type="password"
              value={passwordInput}
              onChange={(event) => setPasswordInput(event.target.value)}
              placeholder="Enter startup password"
            />
            <div className="quick-action-row">
              <button
                className="button"
                type="button"
                onClick={() => { void unlockControl(); }}
                disabled={createAuthSessionMutation.isPending}
              >
                {createAuthSessionMutation.isPending ? 'Unlocking...' : 'Unlock'}
              </button>
              <button
                className="ghost-button"
                type="button"
                onClick={() => { void lockControl(); }}
                disabled={!authUnlocked || deleteAuthSessionMutation.isPending}
              >
                Lock
              </button>
            </div>
          </div>
        ) : null}

        <div className="glass-note">
          <span className={`status-badge ${authBadge.tone}`}>{authBadge.label}</span>
          <p>{streamError || authHint}</p>
        </div>

        <div className="stat-grid">
          {quickStats.map(({ label, value, hint, icon: Icon }) => (
            <div key={label} className="mini-card stat-card">
              <div className="stat-card-top">
                <span className="panel-icon small-icon">
                  <Icon size={15} />
                </span>
                <span className="metric-eyebrow">{label}</span>
              </div>
              <p className="metric-reading compact-reading">{value}</p>
              <p className="muted-note">{hint}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ControlAccessPanel;
