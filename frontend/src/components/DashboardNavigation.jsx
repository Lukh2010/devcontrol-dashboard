import React from 'react';
import { RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

function DashboardNavigation({
  activePanel,
  isAdmin,
  onRefreshAll,
  panels,
  panelMeta,
  setActivePanel,
  streamBadge
}) {
  return (
    <section className="panel nav-panel">
      <div className="panel-header compact-header">
        <div>
          <h2 className="panel-title">{panelMeta.title}</h2>
          <p className="panel-subtitle">{panelMeta.subtitle}</p>
        </div>
        <div className="chip-row">
          <span className={`status-badge ${streamBadge.tone}`}>{streamBadge.label}</span>
          <span className={`status-badge ${isAdmin ? 'status-success' : 'status-warning'}`}>
            {isAdmin ? 'Admin' : 'User mode'}
          </span>
          <button className="ghost-button compact-action-button" type="button" onClick={() => { void onRefreshAll(); }}>
            <RefreshCw size={16} />
            Refresh all
          </button>
        </div>
      </div>

      <div className="panel-body">
        <nav className="nav-grid" aria-label="Dashboard navigation">
          {panels.map(({ id, label, icon: Icon }) => (
            <motion.button
              key={id}
              type="button"
              className={`nav-card ${activePanel === id ? 'active' : ''}`}
              onClick={() => setActivePanel(id)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.99 }}
            >
              <span className="panel-icon nav-icon">
                <Icon size={16} />
              </span>
              <span className="nav-card-label">{label}</span>
            </motion.button>
          ))}
        </nav>
      </div>
    </section>
  );
}

export default DashboardNavigation;
