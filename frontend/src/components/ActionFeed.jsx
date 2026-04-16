import React from 'react';
import { BellRing, Clock3 } from 'lucide-react';

function formatActionTime(timestamp) {
  if (!timestamp) {
    return 'just now';
  }

  return new Date(timestamp).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

const ActionFeed = ({ actions }) => (
  <section className="panel">
    <div className="panel-header compact-header">
      <div className="panel-title-wrap">
        <span className="panel-icon">
          <BellRing size={18} />
        </span>
        <div>
          <h2 className="panel-title">Recent actions</h2>
          <p className="panel-subtitle">Live feedback from protected actions and terminal state.</p>
        </div>
      </div>
    </div>

    <div className="panel-body">
      {actions?.length ? (
        <div className="action-feed" aria-live="polite">
          {actions.map((action, index) => (
            <div key={`${action.action}-${action.timestamp}-${index}`} className="action-feed-item">
              <div className="action-feed-top">
                <span className={`status-badge status-${action.severity || 'neutral'}`}>{action.status}</span>
                <span className="muted-note action-time">
                  <Clock3 size={13} />
                  {formatActionTime(action.timestamp)}
                </span>
              </div>
              <div className="action-feed-title">{action.message || action.action}</div>
              <div className="muted-note wrap-text">
                {[action.entity_type, action.entity_id].filter(Boolean).join(' / ') || 'dashboard'}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="center-empty compact-empty">No recent actions yet.</div>
      )}
    </div>
  </section>
);

export default ActionFeed;
