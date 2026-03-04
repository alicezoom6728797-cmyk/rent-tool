import { useState, useRef, useCallback, useEffect } from 'react';
import { getAMap, getMap, onMapReady } from '../services/amapService';

type MeasureState = 'idle' | 'measuring';

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

function calcTotalDistance(AMap: any, points: [number, number][]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += AMap.GeometryUtil.distance(points[i - 1], points[i]);
  }
  return total;
}

export default function RulerTool() {
  const [state, setState] = useState<MeasureState>('idle');
  const [distance, setDistance] = useState<number | null>(null);
  const [pointCount, setPointCount] = useState(0);
  const [mapAvailable, setMapAvailable] = useState(false);

  const overlaysRef = useRef<any[]>([]);
  const pointsRef = useRef<[number, number][]>([]);
  const polylineRef = useRef<any>(null);
  const clickHandlerRef = useRef<((e: any) => void) | null>(null);
  const rightClickHandlerRef = useRef<((e: any) => void) | null>(null);

  useEffect(() => {
    onMapReady(() => setMapAvailable(true));
  }, []);

  const clearOverlays = useCallback(() => {
    const map = getMap();
    if (!map) return;
    overlaysRef.current.forEach((o) => { try { map.remove(o); } catch {} });
    overlaysRef.current = [];
    if (polylineRef.current) {
      try { map.remove(polylineRef.current); } catch {}
      polylineRef.current = null;
    }
  }, []);

  const detachMapEvents = useCallback(() => {
    const map = getMap();
    if (!map) return;
    if (clickHandlerRef.current) {
      map.off('click', clickHandlerRef.current);
      clickHandlerRef.current = null;
    }
    if (rightClickHandlerRef.current) {
      map.off('rightclick', rightClickHandlerRef.current);
      rightClickHandlerRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    detachMapEvents();
    clearOverlays();
    pointsRef.current = [];
    setDistance(null);
    setPointCount(0);
    const map = getMap();
    if (map) map.setDefaultCursor('default');
  }, [clearOverlays, detachMapEvents]);

  const addPointMarker = useCallback((pos: [number, number], index: number) => {
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
      ">${index + 1}</div>`,
      offset: new AMap.Pixel(-11, -11),
    });
    overlaysRef.current.push(marker);
  }, []);

  const updatePolyline = useCallback(() => {
    const AMap = getAMap();
    const map = getMap();
    if (!AMap || !map || pointsRef.current.length < 2) return;

    if (polylineRef.current) {
      polylineRef.current.setPath(pointsRef.current);
    } else {
      polylineRef.current = new AMap.Polyline({
        path: pointsRef.current,
        strokeColor: '#1677ff',
        strokeWeight: 3,
        strokeStyle: 'dashed',
        strokeDasharray: [8, 6],
        strokeOpacity: 0.8,
        zIndex: 290,
      });
      polylineRef.current.setMap(map);
    }

    setDistance(calcTotalDistance(AMap, pointsRef.current));
  }, []);

  const finishMeasure = useCallback(() => {
    const AMap = getAMap();
    const map = getMap();
    if (!AMap || !map) return;

    detachMapEvents();
    map.setDefaultCursor('default');
    setState('idle');

    if (pointsRef.current.length >= 2) {
      setDistance(calcTotalDistance(AMap, pointsRef.current));
    }
  }, [detachMapEvents]);

  const startMeasure = useCallback(() => {
    const AMap = getAMap();
    const map = getMap();
    if (!AMap || !map) return;

    cleanup();
    setState('measuring');
    map.setDefaultCursor('crosshair');

    const onClick = (e: any) => {
      const lnglat = e.lnglat;
      const pos: [number, number] = [Number(lnglat.getLng()), Number(lnglat.getLat())];

      pointsRef.current.push(pos);
      const idx = pointsRef.current.length - 1;
      addPointMarker(pos, idx);
      setPointCount(pointsRef.current.length);

      if (pointsRef.current.length >= 2) {
        updatePolyline();
      }
    };

    const onRightClick = () => {
      finishMeasure();
    };

    clickHandlerRef.current = onClick;
    rightClickHandlerRef.current = onRightClick;
    map.on('click', onClick);
    map.on('rightclick', onRightClick);
  }, [cleanup, addPointMarker, updatePolyline, finishMeasure]);

  const stopMeasure = useCallback(() => {
    setState('idle');
    cleanup();
  }, [cleanup]);

  if (!mapAvailable) return null;

  const isActive = state === 'measuring' || distance !== null;

  return (
    <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 500 }}>
      <div style={{
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
        overflow: 'hidden',
        minWidth: 44,
      }}>
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

        {state === 'measuring' && (
          <div style={{
            padding: '6px 12px', fontSize: 12, color: '#666',
            borderTop: '1px solid #f0f0f0', background: '#fafafa',
          }}>
            {pointCount === 0
              ? '左键点击添加起点'
              : `已添加 ${pointCount} 个点，右键结束`}
          </div>
        )}

        {distance !== null && (
          <div style={{
            padding: '8px 12px',
            borderTop: '1px solid #f0f0f0',
            fontSize: 12,
            lineHeight: 1.8,
          }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#1677ff', marginBottom: 2 }}>
              总距离：{formatDistance(distance)}
            </div>
            <div style={{ color: '#555' }}>
              🚶 步行：{estimateTime(distance, 5)}
            </div>
            <div style={{ color: '#555' }}>
              🚲 骑行：{estimateTime(distance, 15)}
            </div>
            {pointCount > 2 && (
              <div style={{ color: '#999', fontSize: 11, marginTop: 2 }}>
                共 {pointCount} 个节点，{pointCount - 1} 段路径
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
