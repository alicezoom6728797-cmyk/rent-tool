import { useState, useRef, useCallback, useEffect } from 'react';
import { getAMap, getMap, onMapReady } from '../services/amapService';

type MeasureState = 'idle' | 'first' | 'second';

function formatDistance(meters: number): string {
  if (meters >= 1000) return (meters / 1000).toFixed(2) + ' km';
  return Math.round(meters) + ' m';
}

function estimateTime(meters: number, speedKmh: number): string {
  const minutes = (meters / 1000 / speedKmh) * 60;
  if (minutes < 1) return '< 1 分钟';
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return m > 0 ? `${h} 小时 ${m} 分钟` : `${h} 小时`;
  }
  return `${Math.round(minutes)} 分钟`;
}

export default function RulerTool() {
  const [state, setState] = useState<MeasureState>('idle');
  const [distance, setDistance] = useState<number | null>(null);
  const [mapAvailable, setMapAvailable] = useState(false);

  const overlaysRef = useRef<any[]>([]);
  const pointsRef = useRef<[number, number][]>([]);
  const clickHandlerRef = useRef<((e: any) => void) | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    onMapReady(() => setMapAvailable(true));
  }, []);

  const clearOverlays = useCallback(() => {
    const map = getMap();
    if (!map) return;
    overlaysRef.current.forEach((o) => { try { map.remove(o); } catch {} });
    overlaysRef.current = [];
  }, []);

  const cleanup = useCallback(() => {
    const map = getMap();
    if (map && clickHandlerRef.current) {
      map.off('click', clickHandlerRef.current);
      clickHandlerRef.current = null;
    }
    clearOverlays();
    pointsRef.current = [];
    setDistance(null);
    if (map) map.setDefaultCursor('default');
  }, [clearOverlays]);

  const addPointMarker = useCallback((pos: [number, number], label: string) => {
    const AMap = getAMap();
    const map = getMap();
    if (!AMap || !map) return;
    const marker = new AMap.Marker({
      position: pos, map, zIndex: 300,
      content: `<div style="
        width:22px;height:22px;border-radius:50%;
        background:#1677ff;border:3px solid #fff;
        box-shadow:0 2px 8px rgba(0,0,0,0.3);
        display:flex;align-items:center;justify-content:center;
        font-size:11px;color:#fff;font-weight:700;
      ">${label}</div>`,
      offset: new AMap.Pixel(-11, -11),
    });
    overlaysRef.current.push(marker);
  }, []);

  const drawLine = useCallback((p1: [number, number], p2: [number, number]) => {
    const AMap = getAMap();
    const map = getMap();
    if (!AMap || !map) return;

    const dashedLine = new AMap.Polyline({
      path: [p1, p2],
      strokeColor: '#1677ff',
      strokeWeight: 3,
      strokeStyle: 'dashed',
      strokeDasharray: [8, 6],
      strokeOpacity: 0.8,
      zIndex: 290,
    });
    dashedLine.setMap(map);
    overlaysRef.current.push(dashedLine);
  }, []);

  const startMeasure = useCallback(() => {
    const AMap = getAMap();
    const map = getMap();
    if (!AMap || !map) return;

    cleanup();
    setState('first');
    map.setDefaultCursor('crosshair');

    const handler = (e: any) => {
      const lnglat = e.lnglat;
      const pos: [number, number] = [Number(lnglat.getLng()), Number(lnglat.getLat())];

      if (stateRef.current === 'first') {
        pointsRef.current = [pos];
        addPointMarker(pos, 'A');
        setState('second');
      } else if (stateRef.current === 'second') {
        pointsRef.current.push(pos);
        addPointMarker(pos, 'B');
        drawLine(pointsRef.current[0], pos);

        const dist = AMap.GeometryUtil.distance(pointsRef.current[0], pos);
        setDistance(dist);
        setState('idle');
        map.setDefaultCursor('default');
        map.off('click', handler);
        clickHandlerRef.current = null;
      }
    };

    clickHandlerRef.current = handler;
    map.on('click', handler);
  }, [cleanup, addPointMarker, drawLine]);

  const stopMeasure = useCallback(() => {
    setState('idle');
    cleanup();
  }, [cleanup]);

  if (!mapAvailable) return null;

  const isActive = state !== 'idle' || distance !== null;

  return (
    <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 500 }}>
      <div style={{
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
        overflow: 'hidden',
        minWidth: 44,
      }}>
        {/* Toggle button */}
        <div
          onClick={isActive ? stopMeasure : startMeasure}
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            background: isActive ? '#1677ff' : '#fff',
            color: isActive ? '#fff' : '#333',
            transition: 'all 0.2s',
            fontSize: 13,
            fontWeight: 500,
            userSelect: 'none',
          }}
          title={isActive ? '关闭测量' : '测量距离'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 22L22 2" />
            <path d="M6 18l2-2" />
            <path d="M10 14l2-2" />
            <path d="M14 10l2-2" />
          </svg>
          <span>测距</span>
        </div>

        {/* Hint text */}
        {state === 'first' && (
          <div style={{
            padding: '6px 12px', fontSize: 12, color: '#666',
            borderTop: '1px solid #f0f0f0', background: '#fafafa',
          }}>
            点击地图选择起点 A
          </div>
        )}
        {state === 'second' && (
          <div style={{
            padding: '6px 12px', fontSize: 12, color: '#666',
            borderTop: '1px solid #f0f0f0', background: '#fafafa',
          }}>
            点击地图选择终点 B
          </div>
        )}

        {/* Result */}
        {distance !== null && (
          <div style={{
            padding: '8px 12px',
            borderTop: '1px solid #f0f0f0',
            fontSize: 12,
            lineHeight: 1.8,
          }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#1677ff', marginBottom: 2 }}>
              {formatDistance(distance)}
            </div>
            <div style={{ color: '#555' }}>
              🚶 步行：{estimateTime(distance, 5)}
            </div>
            <div style={{ color: '#555' }}>
              🚲 骑行：{estimateTime(distance, 15)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
