import React from 'react';
import { ServerCog } from 'lucide-react';

const SystemReadiness = ({ items }) => (
  <section className="panel">
    <div className="panel-header compact-header">
      <div className="panel-title-wrap">
        <span className="panel-icon">
          <ServerCog size={18} />
        </span>
        <div>
          <h2 className="panel-title">System readiness</h2>
          <p className="panel-subtitle">What is ready, blocked, or waiting right now.</p>
        </div>
      </div>
    </div>

    <div className="panel-body">
      <div className="readiness-grid">
        {items.map((item) => (
          <div key={item.label} className="mini-card readiness-card">
            <div className="readiness-card-top">
              <span className="metric-eyebrow">{item.label}</span>
              <span className={`status-badge ${item.badgeTone}`}>{item.badgeLabel}</span>
            </div>
            <div className="readiness-summary">{item.summary}</div>
            <div className="muted-note wrap-text">{item.hint}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default SystemReadiness;
