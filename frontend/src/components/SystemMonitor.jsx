import React from 'react';
import { Activity, Cpu, HardDrive, MemoryStick } from 'lucide-react';
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
              <h2 className="panel-title">System</h2>
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
    {
      label: 'CPU',
      value: performanceData.cpu_percent,
      detail: performanceData.cpu_count ? `${performanceData.cpu_count} cores` : 'Core count unavailable',
      icon: Cpu
    },
    {
      label: 'Memory',
      value: performanceData.memory.percent,
      detail: `${Math.round(performanceData.memory.used / 1024 / 1024 / 1024)} GB used`,
      icon: MemoryStick
    },
    {
      label: 'Disk',
      value: performanceData.disk.percent,
      detail: `${Math.round(performanceData.disk.free / 1024 / 1024 / 1024)} GB free`,
      icon: HardDrive
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
            <Activity size={18} />
          </span>
          <div>
            <h2 className="panel-title">System</h2>
          </div>
        </div>
      </div>
      <div className="panel-body">
        <div className="metrics-three">
          {metrics.map((metric) => {
            const Icon = metric.icon;

            return (
              <motion.div
                key={metric.label}
                className="mini-card"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <div className="overview-card-top">
                  <span className="panel-icon small-icon">
                    <Icon size={15} />
                  </span>
                  <p className="metric-eyebrow">{metric.label}</p>
                </div>
                <p className="metric-reading">{formatPercent(metric.value)}</p>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${metric.value}%` }} />
                </div>
                <div className="muted-note clamp-text" style={{ marginTop: '10px' }}>{metric.detail}</div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
};

export default SystemMonitor;
