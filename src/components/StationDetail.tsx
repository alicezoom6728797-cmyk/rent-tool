import { List, Button, message, Spin } from 'antd';
import { useState, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import type { StationInfo, RouteInfo } from '../types';
import { getAMap } from '../services/amapService';

interface Props {
  station: StationInfo;
  onRouteAdd: (route: RouteInfo) => void;
}

interface LineInfo {
  id: string;
  name: string;
  startStop: string;
  endStop: string;
  startTime: string;
  endTime: string;
  path: [number, number][];
  stops: { name: string; location?: [number, number]; sequence: number }[];
}

export default function StationDetail({ station, onRouteAdd }: Props) {
  const [lines, setLines] = useState<LineInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const { routes, nextColor } = useAppStore();

  useEffect(() => {
    setLoading(true);
    setLines([]);
    const AMap = getAMap();
    if (!AMap) { setLoading(false); return; }

    // 用 StationSearch 查询站点经过的线路
    const stationSearch = new AMap.StationSearch({ city: '全国' });
    const keyword = station.name
      .replace(/\(.*?\)/g, '')
      .replace(/（.*?）/g, '')
      .replace(/地铁站.*口$/, '')
      .replace(/(地铁站|公交站)$/, '');

    stationSearch.search(keyword, (status: string, result: any) => {
      if (status === 'complete' && result.stationInfo?.length > 0) {
        const allLines: LineInfo[] = [];
        const seen = new Set<string>();

        result.stationInfo.forEach((si: any) => {
          (si.buslines || []).forEach((line: any) => {
            if (seen.has(line.id)) return;
            seen.add(line.id);
            allLines.push({
              id: line.id,
              name: line.name,
              startStop: line.start_stop || '',
              endStop: line.end_stop || '',
              startTime: line.stime || '--',
              endTime: line.etime || '--',
              path: [],
              stops: [],
            });
          });
        });
        setLines(allLines);
      }
      setLoading(false);
    });
  }, [station.id]);

  const isAdded = (lineId: string) => routes.some((r) => r.id === lineId);

  const handleAdd = (line: LineInfo) => {
    if (isAdded(line.id)) return;

    // 用 LineSearch 获取完整路线详情
    const AMap = getAMap();
    if (!AMap) return;

    const lineSearch = new AMap.LineSearch({ city: '全国', extensions: 'all' });
    lineSearch.searchById(line.id, (status: string, result: any) => {
      const color = nextColor();
      let path: [number, number][] = [];
      let stops: RouteInfo['stops'] = [];

      if (status === 'complete' && result.lineInfo?.length > 0) {
        const info = result.lineInfo[0];
        if (info.path) {
          path = info.path.map((p: any) => [p.lng, p.lat] as [number, number]);
        }
        if (info.via_stops) {
          stops = info.via_stops.map((s: any, i: number) => ({
            name: s.name,
            location: s.location ? [s.location.lng, s.location.lat] as [number, number] : undefined,
            sequence: i + 1,
          }));
        }
      }

      onRouteAdd({
        id: line.id,
        name: line.name,
        stationId: station.id,
        stationName: station.name,
        type: station.type,
        color,
        startStop: line.startStop,
        endStop: line.endStop,
        startTime: line.startTime,
        endTime: line.endTime,
        stops,
        path,
        visible: true,
      });
      message.success(`已添加 ${line.name}`);
    });
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 20 }}><Spin tip="查询线路中..." /></div>;
  }

  return (
    <div>
      <div style={{ marginBottom: 8, fontWeight: 600 }}>
        {station.type === 'subway' ? '🔵' : '🟢'} {station.name}
        <span style={{ fontWeight: 400, color: '#999', marginLeft: 8 }}>{station.distance}m</span>
      </div>
      {lines.length === 0 && (
        <div style={{ color: '#999', padding: 8 }}>未找到经过该站的线路</div>
      )}
      <List
        dataSource={lines}
        size="small"
        split={false}
        renderItem={(line) => (
          <List.Item
            style={{ padding: '6px 0' }}
            actions={[
              <Button
                size="small"
                type={isAdded(line.id) ? 'default' : 'primary'}
                disabled={isAdded(line.id)}
                onClick={() => handleAdd(line)}
              >
                {isAdded(line.id) ? '已添加' : '添加'}
              </Button>,
            ]}
          >
            <List.Item.Meta
              title={<span style={{ fontSize: 13 }}>{line.name}</span>}
              description={
                <span style={{ fontSize: 12 }}>
                  {line.startTime}–{line.endTime}
                </span>
              }
            />
          </List.Item>
        )}
      />
    </div>
  );
}
