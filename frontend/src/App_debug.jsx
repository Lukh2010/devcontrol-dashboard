import React from 'react';

function App() {
  return (
    <div style={{ backgroundColor: '#0a0e13', color: '#00ff41', padding: '20px', fontFamily: 'monospace' }}>
      <h1>DEVCONTROL DASHBOARD - DEBUG MODE</h1>
      <p>If you can see this, React is working!</p>
      <div style={{ marginTop: '20px', backgroundColor: '#1a202c', padding: '10px' }}>
        <p>Backend API Test:</p>
        <button onClick={() => fetch('http://localhost:8000/api/system/info').then(r => r.json()).then(console.log)}>
          Test API
        </button>
      </div>
    </div>
  );
}

export default App;
