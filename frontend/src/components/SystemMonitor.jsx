import React from 'react';
import { Activity } from 'lucide-react';
import { motion } from 'motion/react';

const formatPercent = (value) => `${value.toFixed(1)}%`;

const SystemMonitor = ({ performanceData }) => {
  if (!performanceData) {
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
              <Activity size={18} />
            </span>
            <div>
              <h2 className="panel-title">System Performance</h2>
              <p className="panel-subtitle">Waiting for live stream CPU, memory, and disk usage.</p>
            </div>
          </div>
        </div>
        <div className="panel-body">
          <div className="center-empty">Loading system data...</div>
        </div>
      </motion.section>
    );
  }

  const metrics = [
    { label: 'CPU Usage', value: performanceData.cpu_percent },
    { label: 'Memory Usage', value: performanceData.memory.percent },
    { label: 'Disk Usage', value: performanceData.disk.percent }
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
            <Activity size={18} />
          </span>
          <div>
            <h2 className="panel-title">System Performance</h2>
            <p className="panel-subtitle">Primary resource pressure indicators for the local machine.</p>
          </div>
        </div>
      </div>
      <div className="panel-body">
        <div className="metrics-three">
          {metrics.map((metric) => (
            <motion.div
              key={metric.label}
              className="mini-card"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <p className="metric-eyebrow">{metric.label}</p>
              <p className="metric-reading">{formatPercent(metric.value)}</p>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${metric.value}%` }} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
};

export default SystemMonitor;
