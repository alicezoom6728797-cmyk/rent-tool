import { useEffect, useRef } from 'react';
import { getAMap, getMap } from '../services/amapService';
import { useAppStore } from '../stores/appStore';
import type { StationInfo } from '../types';

export function useMapMarkers(onStationClick: (s: StationInfo) => void) {
  const { stations, center, routes } = useAppStore();
  const markersRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);
  const centerMarkerRef = useRef<any>(null);

  // 绘制站点标记
  useEffect(() => {
    const AMap = getAMap();
    const map = getMap();
    if (!AMap || !map) return;

    // 清除旧站点标记
    markersRef.current.forEach((m) => map.remove(m));
    markersRef.current = [];

    // 中心点标记
    if (center) {
      if (centerMarkerRef.current) {
        map.remove(centerMarkerRef.current);
      }
      centerMarkerRef.current = new AMap.Marker({
        position: center,
        map,
        zIndex: 200,
        content: `<div style="
          width:20px;height:20px;
          background:#ff4d4f;
          border:3px solid #fff;
          border-radius:50%;
          box-shadow:0 2px 6px rgba(0,0,0,0.3);
        "></div>`,
        offset: new AMap.Pixel(-10, -10),
      });
    }

    stations.forEach((station) => {
      const color = station.type === 'subway' ? '#1677ff' : '#52c41a';
      const marker = new AMap.Marker({
        position: station.location,
        map,
        zIndex: 100,
        content: `<div style="
          width:14px;height:14px;
          background:${color};
          border:2px solid #fff;
          border-radius:${station.type === 'subway' ? '50%' : '3px'};
          box-shadow:0 1px 4px rgba(0,0,0,0.3);
          cursor:pointer;
        "></div>`,
        offset: new AMap.Pixel(-7, -7),
        title: `${station.name} (${station.distance}m)`,
      });

      marker.on('click', () => onStationClick(station));
      markersRef.current.push(marker);
    });
  }, [stations, center]);

  // 绘制路线
  useEffect(() => {
    const AMap = getAMap();
    const map = getMap();
    if (!AMap || !map) return;

    // 清除旧路线
    polylinesRef.current.forEach((p) => map.remove(p));
    polylinesRef.current = [];

    routes
      .filter((r) => r.visible && r.path && r.path.length > 0)
      .forEach((route) => {
        const polyline = new AMap.Polyline({
          path: route.path,
          strokeColor: route.color,
          strokeWeight: 5,
          strokeOpacity: 0.8,
          lineJoin: 'round',
          lineCap: 'round',
          zIndex: 50,
          map,
        });
        polylinesRef.current.push(polyline);

        // 站点小圆点
        route.stops.forEach((stop) => {
          if (stop.location) {
            const dot = new AMap.CircleMarker({
              center: stop.location,
              radius: 4,
              fillColor: route.color,
              fillOpacity: 1,
              strokeColor: '#fff',
              strokeWeight: 1,
              zIndex: 60,
              map,
            });
            polylinesRef.current.push(dot);
          }
        });
      });
  }, [routes]);
}
