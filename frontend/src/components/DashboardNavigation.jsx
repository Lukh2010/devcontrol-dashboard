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
    <header className="panel nav-panel-apple">
      <div className="nav-apple-top">
        <div className="nav-apple-brand">
          <span className="brand-dot" aria-hidden="true" />
          <h1 className="nav-apple-title">DevControl</h1>
          <span className="nav-apple-divider" aria-hidden="true">/</span>
          <span className="nav-apple-active-name">{panelMeta.title}</span>
        </div>

        <div className="nav-apple-controls">
          <div className="status-pill-group">
            <span className={`status-dot-inline ${streamBadge.tone}`} />
            <span className="status-pill-text">{streamBadge.label}</span>
          </div>

          <span className={`status-tag ${isAdmin ? 'admin' : 'user'}`}>
            {isAdmin ? 'Admin' : 'User'}
          </span>

          <button
            className="apple-icon-button"
            type="button"
            onClick={() => { void onRefreshAll(); }}
            title="Refresh dashboard data"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="nav-apple-tabs-wrapper">
        <nav className="nav-apple-tabs" aria-label="Main navigation">
          {panels.map(({ id, label, icon: Icon }) => {
            const isActive = activePanel === id;
            return (
              <button
                key={id}
                type="button"
                className={`nav-apple-tab ${isActive ? 'active' : ''}`}
                onClick={() => setActivePanel(id)}
              >
                {isActive && (
                  <motion.div
                    className="nav-apple-tab-bg"
                    layoutId="activeTabIndicator"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <Icon size={15} className="nav-apple-tab-icon" />
                <span className="nav-apple-tab-label">{label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

export default DashboardNavigation;
