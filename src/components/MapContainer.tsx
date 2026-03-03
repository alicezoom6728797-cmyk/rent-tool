import { useEffect, useRef } from 'react';
import { initAMap } from '../services/amapService';

export default function MapContainer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || !containerRef.current) return;
    initialized.current = true;
    initAMap(containerRef.current);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
