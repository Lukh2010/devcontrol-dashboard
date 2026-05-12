import React from 'react';
import { Activity, Cpu, HardDrive, LockKeyhole, MemoryStick, Network, ServerCog, Terminal, Wifi } from 'lucide-react';
import { motion } from 'motion/react';

function formatPercent(value) {
  if (typeof value !== 'number') {
    return 'Waiting';
  }

  return `${value.toFixed(1)}%`;
}

function formatActionTime(timestamp) {
  if (!timestamp) {
    return 'now';
  }

  return new Date(timestamp).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function getHealthStatus({ systemInfo, health, authBadge, streamBadge, terminalReadiness }) {
  return [
    {
      label: 'Backend',
      value: systemInfo ? 'Ready' : 'Waiting',
      tone: systemInfo ? 'status-success' : 'status-warning',
      icon: ServerCog
    },
    {
      label: 'Frontend',
      value: 'Ready',
      tone: 'status-success',
      icon: Activity
    },
    {
      label: 'Terminal Gateway',
      value: health?.terminal?.thread_alive ? terminalReadiness.label : 'Starting',
      tone: health?.terminal?.thread_alive ? terminalReadiness.tone : 'status-warning',
      icon: Terminal
    },
    {
      label: 'Security',
      value: authBadge.label,
      tone: authBadge.tone,
      icon: LockKeyhole
    },
    {
      label: 'Live Stream',
      value: streamBadge.label,
      tone: streamBadge.tone,
      icon: Wifi
    }
  ];
}

function OverviewDashboard({
  actionFeed,
  attentionItems,
  authBadge,
  health,
  networkInfo,
  onOpenPanel,
  onRefreshAll,
  performanceData,
  ports,
  processes,
  streamBadge,
  systemInfo,
  terminalReadiness
}) {
  const healthItems = getHealthStatus({ systemInfo, health, authBadge, streamBadge, terminalReadiness });
  const memory = performanceData?.memory;
  const interfaceCount = Object.keys(networkInfo?.interfaces || {}).length;
  const visibleAttention = attentionItems.slice(0, 2);
  const recentActions = actionFeed.slice(0, 3);

  const statCards = [
    {
      label: 'CPU',
      value: formatPercent(performanceData?.cpu_percent),
      detail: performanceData?.cpu_count ? `${performanceData.cpu_count} cores` : 'No sample yet',
      progress: performanceData?.cpu_percent || 0,
      icon: Cpu
    },
    {
      label: 'RAM',
      value: formatPercent(memory?.percent),
      detail: memory ? `${Math.round(memory.used / 1024 / 1024 / 1024)} GB used` : 'No sample yet',
      progress: memory?.percent || 0,
      icon: MemoryStick
    },
    {
      label: 'Processes',
      value: String(processes?.length || 0),
      detail: `${ports?.length || 0} listening ports`,
      progress: Math.min((processes?.length || 0) / 4, 100),
      icon: HardDrive
    },
    {
      label: 'Network',
      value: `${interfaceCount} interfaces`,
      detail: networkInfo?.sensitive_masked ? 'Details masked' : networkInfo?.default_gateway || 'Gateway unknown',
      progress: interfaceCount ? 100 : 18,
      icon: Network
    }
  ];

  return (
    <motion.div
      key="overview"
      className="overview-home"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
    >
      <section className="panel overview-status-panel">
        <div className="panel-body overview-status-body">
          <div className="overview-status-copy">
            <p className="hero-kicker">DevControl</p>
            <h2 className="overview-home-title">Local control center</h2>
            <p className="overview-home-subtitle">
              Monitor the local runtime, review protected actions and jump into the tools that need attention.
            </p>
          </div>

          <div className="overview-status-grid">
            {healthItems.map(({ label, value, tone, icon: Icon }) => {
              const targetPanel = label === 'Terminal Gateway'
                ? 'commands'
                : label === 'Security'
                  ? 'process-manager'
                  : null;
              const CardTag = targetPanel ? 'button' : 'div';

              return (
                <CardTag
                  key={label}
                  className={`overview-status-card ${targetPanel ? 'is-clickable' : ''}`}
                  type={targetPanel ? 'button' : undefined}
                  onClick={targetPanel ? () => onOpenPanel(targetPanel) : undefined}
                >
                  <span className="panel-icon small-icon">
                    <Icon size={15} />
                  </span>
                  <span className="overview-status-text">
                    <span className="metric-eyebrow">{label}</span>
                    <span className="overview-status-value">{value}</span>
                  </span>
                  <span className={`status-dot ${tone}`} aria-hidden="true" />
                </CardTag>
              );
            })}
          </div>
        </div>
      </section>

      <section className="overview-main-grid">
        <div className="overview-stat-grid">
          {statCards.map(({ label, value, detail, progress, icon: Icon }) => (
            <div key={label} className="mini-card overview-stat-card">
              <div className="overview-card-top">
                <span className="panel-icon small-icon">
                  <Icon size={15} />
                </span>
                <span className="metric-eyebrow">{label}</span>
              </div>
              <p className="metric-reading overview-stat-value">{value}</p>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
              </div>
              <div className="muted-note clamp-text">{detail}</div>
            </div>
          ))}
        </div>

        <div className="overview-side-stack">
          <section className="panel calm-panel">
            <div className="panel-header compact-header">
              <div>
                <h2 className="panel-title">Attention</h2>
                <p className="panel-subtitle">Only the current high-signal items.</p>
              </div>
              <button className="ghost-button compact-action-button" type="button" onClick={onRefreshAll}>
                Refresh
              </button>
            </div>
            <div className="panel-body compact-panel-body">
              {visibleAttention.length ? (
                <div className="clean-list">
                  {visibleAttention.map((item) => (
                    <div key={item.title} className="clean-list-item">
                      <span className={`status-pill ${item.severity === 'danger' ? 'danger' : item.severity === 'warning' ? 'warn' : 'neutral'}`}>
                        {item.label}
                      </span>
                      <div>
                        <div className="action-feed-title">{item.title}</div>
                        <div className="muted-note wrap-text">{item.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overview-empty-state">
                  <div className="action-feed-title">No immediate issues</div>
                  <div className="muted-note">Telemetry, auth and terminal state look stable.</div>
                </div>
              )}
            </div>
          </section>

          <section className="panel calm-panel">
            <div className="panel-header compact-header">
              <div>
                <h2 className="panel-title">Recent activity</h2>
                <p className="panel-subtitle">Latest protected actions and terminal events.</p>
              </div>
            </div>
            <div className="panel-body compact-panel-body">
              {recentActions.length ? (
                <div className="clean-list">
                  {recentActions.map((action, index) => (
                    <div key={`${action.action}-${action.timestamp}-${index}`} className="clean-list-item">
                      <span className={`status-pill ${action.severity === 'danger' ? 'danger' : action.severity === 'warning' ? 'warn' : action.severity === 'success' ? 'good' : 'neutral'}`}>
                        {action.status}
                      </span>
                      <div>
                        <div className="action-feed-title">{action.message || action.action}</div>
                        <div className="muted-note">{formatActionTime(action.timestamp)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overview-empty-state">
                  <div className="action-feed-title">No activity yet</div>
                  <div className="muted-note">Actions will appear here when they happen.</div>
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
    </motion.div>
  );
}

export default OverviewDashboard;
