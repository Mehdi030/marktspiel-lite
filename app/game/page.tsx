'use client';
import { useEffect, useState } from 'react';
import Dashboard from '@/components/Dashboard';

export default function GamePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let devId = '';
    try {
      devId = localStorage.getItem('ms_dev_uid') ?? '';
      if (!devId) {
        devId = crypto.randomUUID();
        localStorage.setItem('ms_dev_uid', devId);
      }
    } catch { devId = 'dev-' + Date.now(); }

    setUserId(devId);
    setReady(true);
  }, []);

  if (!ready || !userId) {
    return (
      <div style={{ minHeight: '100vh', background: '#06070d', display: 'flex',
        alignItems: 'center', justifyContent: 'center', color: '#4e5470', fontSize: 14 }}>
        Starte…
      </div>
    );
  }

  return <Dashboard userId={userId} />;
}
