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
      label: 'Stream Status',
      value: stale ? 'Stale' : streamStatus === 'connected' ? 'Live' : 'Recovering',
      detail: stale ? 'Waiting for fresh telemetry' : 'Telemetry pipeline is active'
    },
    {
      key: 'processes',
      icon: Cpu,
      label: 'Top Process',
      value: busiestProcess ? busiestProcess.name : 'No data',
      detail: busiestProcess ? `${busiestProcess.cpu_percent}% CPU · PID ${busiestProcess.pid}` : 'No active process sample'
    },
    {
      key: 'network',
      icon: Wifi,
      label: 'Network Snapshot',
      value: `${ports?.length || 0} Ports`,
      detail: `${interfaceCount} interfaces · ${networkInfo?.default_gateway || 'No gateway'}`
    },
    {
      key: 'security',
      icon: Shield,
      label: 'Control Surface',
      value: terminalState === 'connected' ? 'Terminal Live' : 'Terminal Idle',
      detail: isAdmin ? 'Administrator privileges available' : `Host ${systemInfo?.hostname || 'unknown'}`
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
            <h2 className="panel-title">Control Overview</h2>
            <p className="panel-subtitle">High-signal status cards for the machine, stream, and control plane.</p>
          </div>
        </div>
      </div>
      <div className="panel-body">
        <div className="overview-grid">
          {cards.map(({ key, icon: Icon, label, value, detail }) => (
            <motion.div
              key={key}
              className="mini-card overview-card"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <div className="overview-card-top">
                <span className="panel-icon overview-card-icon">
                  <Icon size={16} />
                </span>
                <span className="metric-eyebrow">{label}</span>
              </div>
              <p className="metric-reading overview-reading">{value}</p>
              <div className="muted-note">{detail}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
};

export default OverviewHighlights;
