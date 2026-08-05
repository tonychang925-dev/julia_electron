import React, { useState, useEffect } from 'react';

const API = window.juliaAPI;

export default function Status() {
  const [online, setOnline] = useState(false);

  useEffect(() => {
    const unsub = API.subscribe((evt) => {
      if (evt.type === 'gateway.connected') setOnline(true);
      if (evt.type === 'gateway.disconnected') setOnline(false);
    });
    return unsub;
  }, []);

  return (
    <div style={styles.bar}>
      <div style={styles.profile}>
        <div style={styles.avatar}> </div>
        <div>
          <div style={styles.name}>Julia</div>
          <div style={styles.status}>
            <span style={{ ...styles.dot, background: online ? '#4CAF50' : '#f44336' }} />
            {online ? 'Online' : 'Offline'}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  bar: { padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', WebkitAppRegion: 'drag' },
  profile: { display: 'flex', gap: '10px', alignItems: 'center', WebkitAppRegion: 'no-drag' },
  avatar: { width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' },
  name: { fontSize: '14px', fontWeight: 600, color: '#e0e0e0' },
  status: { fontSize: '11px', color: '#888', display: 'flex', alignItems: 'center', gap: '4px' },
  dot: { width: '6px', height: '6px', borderRadius: '50%', display: 'inline-block' },
};
