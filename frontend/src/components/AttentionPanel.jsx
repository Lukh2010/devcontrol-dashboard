import React from 'react';
import { Siren } from 'lucide-react';

const AttentionPanel = ({ items, actions }) => (
  <section className="panel">
    <div className="panel-header compact-header">
      <div className="panel-title-wrap">
        <span className="panel-icon">
          <Siren size={18} />
        </span>
        <div>
          <h2 className="panel-title">Attention</h2>
          <p className="panel-subtitle">Prioritized issues that may need action.</p>
        </div>
      </div>
    </div>

    <div className="panel-body stack">
      {items.length ? (
        <div className="attention-list">
          {items.map((item) => (
            <div key={item.title} className="mini-card attention-item">
              <div className="attention-top">
                <div className="action-feed-title">{item.title}</div>
                <span className={`status-badge status-${item.severity}`}>{item.label}</span>
              </div>
              <div className="muted-note wrap-text">{item.description}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mini-card attention-item">
          <div className="action-feed-title">No immediate issues</div>
          <div className="muted-note">Telemetry, auth and terminal state look stable.</div>
        </div>
      )}

      <div className="quick-action-row">
        {actions.map((action) => (
          <button key={action.label} className="ghost-button" type="button" onClick={action.onClick}>
            {action.label}
          </button>
        ))}
      </div>
    </div>
  </section>
);

export default AttentionPanel;
