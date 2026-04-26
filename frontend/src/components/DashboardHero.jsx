import React from 'react';
function formatClock(date) {
  return date.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function formatLastSeen(value) {
  if (!value) {
    return 'Awaiting heartbeat';
  }

  return new Date(value).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function DashboardHero({
  currentTime,
  authBadge,
  streamBadge,
  terminalBadge,
  heroAttention,
  lastHeartbeat,
  stale
}) {
  return (
    <section className="hero-panel panel">
      <div className="hero-copy">
        <span className="hero-kicker">DevControl dashboard</span>
        <h1 className="hero-title">Local control surface with clear trust signals.</h1>
        <div className="hero-badges">
          <span className={`status-badge ${authBadge.tone}`}>{authBadge.label}</span>
          <span className={`status-badge ${streamBadge.tone}`}>{streamBadge.label}</span>
          <span className={`status-badge ${terminalBadge.tone}`}>{terminalBadge.label}</span>
        </div>
        <div className="hero-attention-list">
          {heroAttention.length ? heroAttention.map((item) => (
            <div key={item.title} className="hero-attention-item">
              <span className={`status-badge status-${item.severity}`}>{item.label}</span>
              <span>{item.description}</span>
            </div>
          )) : (
            <div className="hero-attention-item">
              <span className="status-badge status-success">Stable</span>
              <span>No urgent issues detected across auth, terminal and telemetry.</span>
            </div>
          )}
        </div>
      </div>

      <div className="hero-aside">
        <div className="hero-clock">{formatClock(currentTime)}</div>
        <div className="hero-meta">Heartbeat {formatLastSeen(lastHeartbeat)}</div>
        <div className="hero-meta">
          {stale ? 'Telemetry needs refresh' : 'Telemetry pipeline is healthy'}
        </div>
      </div>
    </section>
  );
}

export default DashboardHero;
