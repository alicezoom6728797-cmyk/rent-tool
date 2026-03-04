import { useEffect, useRef } from 'react';
import { getAMap, getMap } from '../services/amapService';
import { useAppStore } from '../stores/appStore';
import type { StopInfo } from '../types';

function toLngLat(p: any): [number, number] {
  if (Array.isArray(p)) return [Number(p[0]), Number(p[1])];
  return [Number(p.lng ?? p.getLng()), Number(p.lat ?? p.getLat())];
}

function isPointNearPath(AMap: any, point: [number, number], path: [number, number][], threshold: number): boolean {
  for (let i = 0; i < path.length - 1; i++) {
    const dist = AMap.GeometryUtil.distanceToSegment(point, path[i], path[i + 1]);
    if (dist < threshold) return true;
  }
  return false;
}

function findNearestStopToCenter(stops: StopInfo[], center: [number, number]): StopInfo | null {
  let nearest: StopInfo | null = null;
  let minDist = Infinity;
  for (const stop of stops) {
    if (!stop.location) continue;
    const dx = stop.location[0] - center[0];
    const dy = stop.location[1] - center[1];
    const dist = dx * dx + dy * dy;
    if (dist < minDist) {
      minDist = dist;
      nearest = stop;
    }
  }
  return nearest;
}

function estimateTravelTime(type: 'subway' | 'bus', stopCount: number): { offPeak: number; morningPeak: number; eveningPeak: number } {
  const baseMinutes = type === 'subway' ? 2 : 3;
  const morningMultiplier = type === 'subway' ? 1.3 : 1.8;
  const eveningMultiplier = type === 'subway' ? 1.25 : 1.7;
  const offPeak = stopCount * baseMinutes;
  return {
    offPeak,
    morningPeak: Math.round(offPeak * morningMultiplier),
    eveningPeak: Math.round(offPeak * eveningMultiplier),
  };
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
  const infoWindowRef = useRef<any>(null);
  const linesRef = useRef(lines);
  linesRef.current = lines;
  const centerRef = useRef(center);
  centerRef.current = center;

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
        content: `<div style="width:12px;height:12px;background:${c};border:2px solid #fff;border-radius:${r};box-shadow:0 1px 3px rgba(0,0,0,0.3);cursor:pointer"></div>`,
        offset: new AMap.Pixel(-6, -6),
      });

      marker.on('click', () => {
        if (infoWindowRef.current) {
          infoWindowRef.current.close();
        }

        const relatedLines = linesRef.current.filter((l) =>
          l.nearestStation === s.name ||
          l.stops.some((stop) => stop.name === s.name)
        );

        const content = `
          <div style="padding:8px 0;min-width:150px;max-width:280px;">
            <div style="font-weight:600;font-size:14px;color:#333;padding:0 10px;margin-bottom:4px;">
              ${s.name}
            </div>
            <div style="font-size:12px;color:#888;padding:0 10px;margin-bottom:8px;">
              ${s.type === 'subway' ? '地铁站' : '公交站'} · 距中心 ${s.distance}m
            </div>
            ${relatedLines.length > 0 ? `
              <div style="border-top:1px solid #f0f0f0;padding-top:6px;">
                <div style="font-size:11px;color:#999;padding:0 10px;margin-bottom:4px;">
                  经过线路 (${relatedLines.length})
                </div>
                ${relatedLines.map((l) => `
                  <div class="station-line-option" data-line-id="${l.id}" style="
                    display:flex;align-items:center;gap:6px;padding:5px 10px;cursor:pointer;
                    transition:background 0.2s;
                  " onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='transparent'">
                    <div style="width:10px;height:10px;border-radius:${l.type === 'subway' ? '50%' : '2px'};
                      background:${l.color};flex-shrink:0;"></div>
                    <span style="font-size:12px;color:#333;">${l.name}</span>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div style="font-size:12px;color:#999;padding:0 10px;font-style:italic;">
                暂无线路数据
              </div>
            `}
          </div>
        `;

        const infoWindow = new AMap.InfoWindow({
          content,
          offset: new AMap.Pixel(0, -10),
          closeWhenClickMap: true,
        });
        infoWindow.open(map, s.location);
        infoWindowRef.current = infoWindow;

        setTimeout(() => {
          const options = document.querySelectorAll('.station-line-option');
          options.forEach((opt) => {
            opt.addEventListener('click', () => {
              const lineId = opt.getAttribute('data-line-id');
              if (lineId) {
                setSelectedLineId(lineId);
                infoWindow.close();
                infoWindowRef.current = null;
              }
            });
          });
        }, 50);
      });

      markersRef.current.push(marker);
    });
  }, [stations, center, setSelectedLineId]);

  // 路线绑制
  useEffect(() => {
    const AMap = getAMap();
    const map = getMap();
    if (!AMap || !map) return;

    routeOverlaysRef.current.forEach((o) => { try { map.remove(o); } catch {} });
    routeOverlaysRef.current = [];
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
      infoWindowRef.current = null;
    }

    const visibleLines = lines.filter((l) => 
      (l.visible || l.id === selectedLineId) && l.loaded && l.path.length > 1
    );
    const hasSelection = selectedLineId != null;
    const selectedOverlays: any[] = [];

    const handleLineClick = (e: any, clickedLine: typeof visibleLines[0]) => {
      const clickPos: [number, number] = toLngLat(e.lnglat);
      const nearbyLines = visibleLines.filter((l) =>
        isPointNearPath(AMap, clickPos, l.path.map(toLngLat), 50)
      );

      if (nearbyLines.length <= 1) {
        setSelectedLineId(clickedLine.id === selectedLineId ? null : clickedLine.id);
        return;
      }

      if (infoWindowRef.current) infoWindowRef.current.close();

      const content = `
        <div style="padding:8px 0;min-width:120px;">
          <div style="font-size:12px;color:#666;margin-bottom:6px;padding:0 8px;">
            此处有 ${nearbyLines.length} 条路线经过
          </div>
          ${nearbyLines.map((l) => `
            <div class="line-option" data-line-id="${l.id}" style="
              display:flex;align-items:center;gap:8px;padding:6px 8px;cursor:pointer;
              border-radius:4px;transition:background 0.2s;
            " onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='transparent'">
              <div style="width:12px;height:12px;border-radius:${l.type === 'subway' ? '50%' : '2px'};
                background:${l.color};flex-shrink:0;"></div>
              <span style="font-size:13px;color:#333;">${l.name}</span>
            </div>
          `).join('')}
        </div>
      `;

      const infoWindow = new AMap.InfoWindow({
        content,
        offset: new AMap.Pixel(0, -10),
        closeWhenClickMap: true,
      });
      infoWindow.open(map, clickPos);
      infoWindowRef.current = infoWindow;

      setTimeout(() => {
        const options = document.querySelectorAll('.line-option');
        options.forEach((opt) => {
          opt.addEventListener('click', () => {
            const lineId = opt.getAttribute('data-line-id');
            if (lineId) {
              setSelectedLineId(lineId);
              infoWindow.close();
              infoWindowRef.current = null;
            }
          });
        });
      }, 50);
    };

    visibleLines.forEach((line) => {
      const isSelected = line.id === selectedLineId;
      const dimmed = hasSelection && !isSelected;
      const path = line.path.map(toLngLat);

      if (isSelected) {
        const glowLine = new AMap.Polyline({
          path, strokeColor: line.color,
          strokeWeight: 14,
          strokeOpacity: 0.35,
          lineJoin: 'round', lineCap: 'round',
          zIndex: 99,
        });
        glowLine.setMap(map);
        routeOverlaysRef.current.push(glowLine);
        selectedOverlays.push(glowLine);
      }

      const polyline = new AMap.Polyline({
        path, strokeColor: line.color,
        strokeWeight: isSelected ? 8 : 5,
        strokeOpacity: dimmed ? 0.3 : isSelected ? 1 : 0.8,
        lineJoin: 'round', lineCap: 'round',
        zIndex: isSelected ? 100 : 50,
        cursor: 'pointer',
      });
      polyline.setMap(map);
      polyline.on('click', (e: any) => handleLineClick(e, line));
      routeOverlaysRef.current.push(polyline);
      if (isSelected) selectedOverlays.push(polyline);

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
          selectedOverlays.push(dot);
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
          dot.on('click', () => {
            if (infoWindowRef.current) infoWindowRef.current.close();
            const currentCenter = centerRef.current;
            if (!currentCenter || !stop.location) return;

            const nearestStop = findNearestStopToCenter(line.stops, currentCenter);
            if (!nearestStop) return;

            const stopCount = Math.abs(stop.sequence - nearestStop.sequence);
            const times = estimateTravelTime(line.type, stopCount);

            const content = stopCount === 0
              ? `
                <div style="padding:8px 10px;min-width:120px;">
                  <div style="font-weight:600;font-size:14px;color:#333;margin-bottom:4px;">${stop.name}</div>
                  <div style="font-size:12px;color:#52c41a;">即为目的地最近站</div>
                </div>
              `
              : `
                <div style="padding:8px 10px;min-width:140px;">
                  <div style="font-weight:600;font-size:14px;color:#333;margin-bottom:4px;">${stop.name}</div>
                  <div style="font-size:12px;color:#666;margin-bottom:6px;">到目的地共 ${stopCount} 站</div>
                  <div style="font-size:12px;color:#333;margin-bottom:2px;">平峰：约 ${times.offPeak} 分钟</div>
                  <div style="font-size:12px;color:#fa8c16;margin-bottom:2px;">早高峰（7-9点）：约 ${times.morningPeak} 分钟</div>
                  <div style="font-size:12px;color:#fa8c16;">晚高峰（17-20点）：约 ${times.eveningPeak} 分钟</div>
                </div>
              `;

            const iw = new AMap.InfoWindow({
              content,
              offset: new AMap.Pixel(0, -8),
              closeWhenClickMap: true,
            });
            iw.open(map, toLngLat(stop.location));
            infoWindowRef.current = iw;
          });
        }
        routeOverlaysRef.current.push(dot);
      });
    });

    if (hasSelection && selectedOverlays.length > 0) {
      if (centerMarkerRef.current) selectedOverlays.push(centerMarkerRef.current);
      map.setFitView(selectedOverlays, false, [60, 60, 60, 400]);
    } else if (routeOverlaysRef.current.length > 0) {
      map.setFitView(routeOverlaysRef.current, false, [60, 60, 60, 400]);
    }
  }, [lines, selectedLineId, setSelectedLineId]);
}
