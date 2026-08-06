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
      label: 'Stream',
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
  const visibleAttention = attentionItems.slice(0, 3);
  const recentActions = actionFeed.slice(0, 4);

  const statCards = [
    {
      label: 'CPU Usage',
      value: formatPercent(performanceData?.cpu_percent),
      detail: performanceData?.cpu_count ? `${performanceData.cpu_count} Cores active` : 'Initialising...',
      progress: performanceData?.cpu_percent || 0,
      icon: Cpu
    },
    {
      label: 'Memory',
      value: formatPercent(memory?.percent),
      detail: memory ? `${Math.round(memory.used / 1024 / 1024 / 1024)} GB / ${Math.round(memory.total / 1024 / 1024 / 1024)} GB` : 'Initialising...',
      progress: memory?.percent || 0,
      icon: MemoryStick
    },
    {
      label: 'Processes',
      value: String(processes?.length || 0),
      detail: `${ports?.length || 0} active listening ports`,
      progress: Math.min((processes?.length || 0) / 4, 100),
      icon: HardDrive
    },
    {
      label: 'Network',
      value: `${interfaceCount} Interfaces`,
      detail: networkInfo?.sensitive_masked ? 'Gateway details masked' : networkInfo?.default_gateway || 'Gateway connected',
      progress: interfaceCount ? 100 : 20,
      icon: Network
    }
  ];

  return (
    <motion.div
      key="overview"
      className="apple-dashboard"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      {/* Top Status Bar */}
      <section className="apple-status-bar">
        <h2 className="sr-only">Dashboard overview</h2>
        <div className="apple-status-items">
          {healthItems.map(({ label, value, tone, icon: Icon }) => {
            const targetPanel = label === 'Terminal Gateway' ? 'commands' : label === 'Security' ? 'process-manager' : null;
            const Tag = targetPanel ? 'button' : 'div';

            return (
              <Tag
                key={label}
                className={`apple-status-chip ${targetPanel ? 'clickable' : ''}`}
                type={targetPanel ? 'button' : undefined}
                onClick={targetPanel ? () => onOpenPanel(targetPanel) : undefined}
              >
                <Icon size={14} className="apple-status-icon" />
                <span className="apple-status-label">{label}</span>
                <span className="apple-status-value">{value}</span>
                <span className={`apple-status-dot ${tone}`} />
              </Tag>
            );
          })}
        </div>
      </section>

      {/* Main Metric Cards Grid */}
      <section className="apple-metrics-grid">
        {statCards.map(({ label, value, detail, progress, icon: Icon }) => (
          <div key={label} className="apple-card apple-metric-card">
            <div className="apple-card-header">
              <span className="apple-card-title">{label}</span>
              <div className="apple-card-icon-wrap">
                <Icon size={16} />
              </div>
            </div>
            <div className="apple-metric-reading">{value}</div>
            <div className="apple-progress-bar">
              <div
                className="apple-progress-fill"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <div className="apple-metric-detail">{detail}</div>
          </div>
        ))}
      </section>

      {/* Bottom Dual Columns: Attention & Recent Activity */}
      <section className="apple-details-grid">
        <div className="apple-card apple-list-card">
          <div className="apple-card-header">
            <div>
              <h2 className="apple-card-heading">Attention</h2>
              <p className="apple-card-subheading">System notices and high-signal alerts</p>
            </div>
          </div>

          <div className="apple-card-body">
            {visibleAttention.length ? (
              <div className="apple-list">
                {visibleAttention.map((item) => (
                  <div key={item.title} className="apple-list-row">
                    <span className={`apple-badge ${item.severity === 'danger' ? 'danger' : item.severity === 'warning' ? 'warn' : 'neutral'}`}>
                      {item.label}
                    </span>
                    <div className="apple-list-content">
                      <div className="apple-list-title">{item.title}</div>
                      <div className="apple-list-sub">{item.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="apple-empty">
                <Activity size={24} className="apple-empty-icon" />
                <div className="apple-empty-title">All systems normal</div>
                <div className="apple-empty-sub">No warnings or critical alerts detected.</div>
              </div>
            )}
          </div>
        </div>

        <div className="apple-card apple-list-card">
          <div className="apple-card-header">
            <div>
              <h2 className="apple-card-heading">Recent activity</h2>
              <p className="apple-card-subheading">Audit stream of executed actions</p>
            </div>
          </div>

          <div className="apple-card-body">
            {recentActions.length ? (
              <div className="apple-list">
                {recentActions.map((action, index) => (
                  <div key={`${action.action}-${action.timestamp}-${index}`} className="apple-list-row">
                    <span className={`apple-badge ${action.severity === 'danger' ? 'danger' : action.severity === 'warning' ? 'warn' : action.severity === 'success' ? 'good' : 'neutral'}`}>
                      {action.status}
                    </span>
                    <div className="apple-list-content">
                      <div className="apple-list-title">{action.message || action.action}</div>
                      <div className="apple-list-sub">{formatActionTime(action.timestamp)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="apple-empty">
                <Terminal size={24} className="apple-empty-icon" />
                <div className="apple-empty-title">No recent actions</div>
                <div className="apple-empty-sub">Executed commands will be listed here.</div>
              </div>
            )}
          </div>
        </div>
      </section>
    </motion.div>
  );
}

export default OverviewDashboard;

