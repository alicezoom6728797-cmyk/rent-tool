import { useEffect, useRef } from 'react';
import { getAMap, getMap } from '../services/amapService';
import { useAppStore } from '../stores/appStore';

function toLngLat(p: any): [number, number] {
  if (Array.isArray(p)) return [Number(p[0]), Number(p[1])];
  return [Number(p.lng ?? p.getLng()), Number(p.lat ?? p.getLat())];
}

export function useMapMarkers() {
  const stations = useAppStore((s) => s.stations);
  const center = useAppStore((s) => s.center);
  const lines = useAppStore((s) => s.lines);
  const selectedLineId = useAppStore((s) => s.selectedLineId);
  const setSelectedLineId = useAppStore((s) => s.setSelectedLineId);

  const markersRef = useRef<any[]>([]);
  const routeOverlaysRef = useRef<any[]>([]);
  const centerMarkerRef = useRef<any>(null);

  // 站点标记
  useEffect(() => {
    const AMap = getAMap();
    const map = getMap();
    if (!AMap || !map) return;

    markersRef.current.forEach((m) => map.remove(m));
    markersRef.current = [];

    if (centerMarkerRef.current) {
      map.remove(centerMarkerRef.current);
      centerMarkerRef.current = null;
    }
    if (center) {
      centerMarkerRef.current = new AMap.Marker({
        position: center, map, zIndex: 200,
        content: '<div style="width:20px;height:20px;background:#ff4d4f;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
        offset: new AMap.Pixel(-10, -10),
      });
    }

    stations.forEach((s) => {
      const c = s.type === 'subway' ? '#1677ff' : '#52c41a';
      const r = s.type === 'subway' ? '50%' : '3px';
      const marker = new AMap.Marker({
        position: s.location, map, zIndex: 100,
        content: `<div style="width:12px;height:12px;background:${c};border:2px solid #fff;border-radius:${r};box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>`,
        offset: new AMap.Pixel(-6, -6),
        title: `${s.name} (${s.distance}m)`,
      });
      markersRef.current.push(marker);
    });
  }, [stations, center]);

  // 路线绑制
  useEffect(() => {
    const AMap = getAMap();
    const map = getMap();
    if (!AMap || !map) return;

    routeOverlaysRef.current.forEach((o) => { try { map.remove(o); } catch {} });
    routeOverlaysRef.current = [];

    const visibleLines = lines.filter((l) => l.visible && l.loaded && l.path.length > 1);
    const hasSelection = selectedLineId != null;

    visibleLines.forEach((line) => {
      const isSelected = line.id === selectedLineId;
      const dimmed = hasSelection && !isSelected;
      const path = line.path.map(toLngLat);

      const polyline = new AMap.Polyline({
        path, strokeColor: line.color,
        strokeWeight: isSelected ? 8 : 5,
        strokeOpacity: dimmed ? 0.3 : isSelected ? 1 : 0.8,
        lineJoin: 'round', lineCap: 'round',
        zIndex: isSelected ? 100 : 50,
        cursor: 'pointer',
      });
      polyline.setMap(map);
      polyline.on('click', () => {
        setSelectedLineId(isSelected ? null : line.id);
      });
      routeOverlaysRef.current.push(polyline);

      line.stops.forEach((stop) => {
        if (!stop.location) return;
        const dot = new AMap.CircleMarker({
          center: toLngLat(stop.location),
          radius: isSelected ? 5 : 4,
          fillColor: line.color, fillOpacity: dimmed ? 0.3 : 1,
          strokeColor: '#fff', strokeWeight: 1,
          zIndex: isSelected ? 110 : 60,
        });
        dot.setMap(map);
        if (isSelected) {
          dot.on('mouseover', () => {
            const label = new AMap.Text({
              text: stop.name, position: toLngLat(stop.location!),
              offset: new AMap.Pixel(8, -12),
              style: {
                'font-size': '12px', 'background': 'rgba(0,0,0,0.7)',
                'color': '#fff', 'padding': '2px 6px', 'border-radius': '3px',
                'border': 'none', 'white-space': 'nowrap',
              },
              zIndex: 200,
            });
            label.setMap(map);
            dot._label = label;
          });
          dot.on('mouseout', () => {
            if (dot._label) {
              map.remove(dot._label);
              dot._label = null;
            }
          });
        }
        routeOverlaysRef.current.push(dot);
      });
    });

    if (routeOverlaysRef.current.length > 0) {
      map.setFitView(routeOverlaysRef.current, false, [60, 60, 60, 400]);
    }
  }, [lines, selectedLineId, setSelectedLineId]);
}
