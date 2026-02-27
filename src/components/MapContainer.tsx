import { useEffect, useRef } from 'react';
import { initAMap } from '../services/amapService';

interface Props {
  onMapReady: () => void;
}

export default function MapContainer({ onMapReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || !containerRef.current) return;
    initialized.current = true;

    initAMap(containerRef.current).then(() => {
      onMapReady();
    });
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
