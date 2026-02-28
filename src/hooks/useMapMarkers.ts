import { useEffect, useRef } from 'react';
import { getAMap, getMap } from '../services/amapService';
import { useAppStore } from '../stores/appStore';
import type { StationInfo } from '../types';

function toLngLat(p: any): [number, number] {
  if (Array.isArray(p)) return [Number(p[0]), Number(p[1])];
  return [Number(p.lng ?? p.getLng()), Number(p.lat ?? p.getLat())];
}

export function useMapMarkers(onStationClick: (s: StationInfo) => void) {
  const stations = useAppStore((s) => s.stations);
  const center = useAppStore((s) => s.center);
  const routes = useAppStore((s) => s.routes);

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

    if (center) {
      if (centerMarkerRef.current) map.remove(centerMarkerRef.current);
      centerMarkerRef.current = new AMap.Marker({
        position: center, map, zIndex: 200,
        content: '<div style="width:20px;height:20px;background:#ff4d4f;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
        offset: new AMap.Pixel(-10, -10),
      });
    }

    stations.forEach((station) => {
      const c = station.type === 'subway' ? '#1677ff' : '#52c41a';
      const r = station.type === 'subway' ? '50%' : '3px';
      const marker = new AMap.Marker({
        position: station.location, map, zIndex: 100,
        content: `<div style="width:14px;height:14px;background:${c};border:2px solid #fff;border-radius:${r};box-shadow:0 1px 4px rgba(0,0,0,0.3);cursor:pointer"></div>`,
        offset: new AMap.Pixel(-7, -7),
        title: `${station.name} (${station.distance}m)`,
      });
      marker.on('click', () => onStationClick(station));
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

    routes.filter((r) => r.visible && r.path && r.path.length > 1).forEach((route) => {
      const path = route.path!.map(toLngLat);

      const polyline = new AMap.Polyline({
        path, strokeColor: route.color, strokeWeight: 5,
        strokeOpacity: 0.8, lineJoin: 'round', lineCap: 'round', zIndex: 50,
      });
      polyline.setMap(map);
      routeOverlaysRef.current.push(polyline);

      route.stops.forEach((stop) => {
        if (!stop.location) return;
        const dot = new AMap.CircleMarker({
          center: toLngLat(stop.location), radius: 4,
          fillColor: route.color, fillOpacity: 1,
          strokeColor: '#fff', strokeWeight: 1, zIndex: 60,
        });
        dot.setMap(map);
        routeOverlaysRef.current.push(dot);
      });
    });
  }, [routes]);
}
