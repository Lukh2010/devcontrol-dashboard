import React from 'react';
import { ActivitySquare, Cpu, Shield, Wifi } from 'lucide-react';
import { motion } from 'motion/react';

const OverviewHighlights = ({
  systemInfo,
  processes,
  ports,
  networkInfo,
  streamStatus,
  terminalState,
  isAdmin,
  stale
}) => {
  const busiestProcess = processes?.[0] ?? null;
  const interfaceCount = Object.keys(networkInfo?.interfaces || {}).length;

  const cards = [
    {
      key: 'stream',
      icon: ActivitySquare,
      label: 'Stream',
      value: stale ? 'Stale' : streamStatus === 'connected' ? 'Live' : 'Recovering',
      detail: stale ? 'Needs refresh' : 'Healthy',
      progress: stale ? 28 : 100
    },
    {
      key: 'processes',
      icon: Cpu,
      label: 'Process',
      value: busiestProcess ? busiestProcess.name : 'No data',
      detail: busiestProcess ? `${busiestProcess.cpu_percent}% | PID ${busiestProcess.pid}` : 'No sample',
      progress: Math.min(busiestProcess?.cpu_percent || 0, 100)
    },
    {
      key: 'network',
      icon: Wifi,
      label: 'Network',
      value: `${ports?.length || 0} Ports`,
      detail: `${interfaceCount} interfaces`,
      progress: Math.min((ports?.length || 0) * 10, 100)
    },
    {
      key: 'security',
      icon: Shield,
      label: 'Terminal',
      value: terminalState === 'connected' ? 'Live' : 'Idle',
      detail: isAdmin ? 'Admin' : `Host ${systemInfo?.hostname || 'unknown'}`,
      progress: terminalState === 'connected' ? 100 : 35
    }
  ];

  return (
    <motion.section
      className="panel"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <div className="panel-header">
        <div className="panel-title-wrap">
          <span className="panel-icon">
            <ActivitySquare size={18} />
          </span>
          <div>
            <h2 className="panel-title">Status</h2>
          </div>
        </div>
      </div>
      <div className="panel-body">
        <div className="overview-grid">
          {cards.map(({ key, icon: Icon, label, value, detail, progress }) => (
            <motion.div
              key={key}
              className="mini-card overview-card"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <div className="overview-card-top">
                <span className="panel-icon small-icon">
                  <Icon size={16} />
                </span>
                <div>
                  <div className="metric-eyebrow">{label}</div>
                  <div className="muted-note clamp-text">{detail}</div>
                </div>
              </div>
              <p className="metric-reading overview-reading clamp-text">{value}</p>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
};

export default OverviewHighlights;
