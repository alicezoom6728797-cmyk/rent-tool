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
}

function parseTimedesc(timedesc: string): { startTime: string; endTime: string; interval: string } {
  try {
    const data = JSON.parse(decodeURIComponent(timedesc));
    const remark = data.allRemark || data.rule_group?.[0]?.remark || '';
    const timeMatch = remark.match(/(\d{2}:\d{2})/g);
    if (timeMatch && timeMatch.length >= 2) {
      return { startTime: timeMatch[0], endTime: timeMatch[timeMatch.length - 1], interval: remark.replace(/\\r\\n/g, ' | ') };
    }
  } catch {}
  return { startTime: '--', endTime: '--', interval: '' };
}

export default function StationDetail({ station, onRouteAdd }: Props) {
  const [lines, setLines] = useState<LineInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const { routes, nextColor, city } = useAppStore();

  const getCity = () => city || '杭州';

  useEffect(() => {
    setLoading(true);
    setLines([]);
    const AMap = getAMap();
    if (!AMap) { setLoading(false); return; }

    const keyword = station.name
      .replace(/\(.*?\)/g, '').replace(/（.*?）/g, '')
      .replace(/地铁站.*口$/, '').replace(/(地铁站|公交站)$/, '');

    const ss = new AMap.StationSearch({ city: getCity() });
    ss.search(keyword, (status: string, result: any) => {
      if (status === 'complete' && result.stationInfo?.length > 0) {
        const seen = new Set<string>();
        const allLines: LineInfo[] = [];
        result.stationInfo.forEach((si: any) => {
          (si.buslines || []).forEach((line: any) => {
            if (seen.has(line.id)) return;
            seen.add(line.id);
            allLines.push({
              id: line.id, name: line.name,
              startStop: line.start_stop || '', endStop: line.end_stop || '',
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
    const AMap = getAMap();
    if (!AMap) return;

    const ls = new AMap.LineSearch({ city: getCity(), extensions: 'all' });
    ls.searchById(line.id, (status: string, result: any) => {
      const color = nextColor();
      let path: [number, number][] = [];
      let stops: RouteInfo['stops'] = [];
      let startTime = '--', endTime = '--', interval = '';

      if (status === 'complete' && result.lineInfo?.length > 0) {
        const info = result.lineInfo[0];
        if (info.path) path = info.path.map((p: any) => [Number(p.lng), Number(p.lat)] as [number, number]);
        if (info.via_stops) stops = info.via_stops.map((s: any, i: number) => ({
          name: s.name,
          location: s.location ? [Number(s.location.lng), Number(s.location.lat)] as [number, number] : undefined,
          sequence: i + 1,
        }));
        if (info.timedesc) {
          const t = parseTimedesc(info.timedesc);
          startTime = t.startTime; endTime = t.endTime; interval = t.interval;
        }
      }

      onRouteAdd({
        id: line.id, name: line.name, stationId: station.id, stationName: station.name,
        type: station.type, color, startStop: line.startStop, endStop: line.endStop,
        startTime, endTime, interval, stops, path, visible: true,
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
              <Button size="small" type={isAdded(line.id) ? 'default' : 'primary'}
                disabled={isAdded(line.id)} onClick={() => handleAdd(line)}>
                {isAdded(line.id) ? '已添加' : '添加'}
              </Button>,
            ]}
          >
            <List.Item.Meta
              title={<span style={{ fontSize: 13 }}>{line.name}</span>}
              description={<span style={{ fontSize: 12 }}>{line.startStop} → {line.endStop}</span>}
            />
          </List.Item>
        )}
      />
    </div>
  );
}
