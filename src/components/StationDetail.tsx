import { List, Button, message, Spin } from 'antd';
import { useState } from 'react';
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
  interval: string;
  path: [number, number][];
  stops: { name: string; location?: [number, number]; sequence: number }[];
}

export default function StationDetail({ station, onRouteAdd }: Props) {
  const [lines, setLines] = useState<LineInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const { routes, nextColor } = useAppStore();

  const searchLines = () => {
    setLoading(true);
    const keyword = station.name.replace(/\(.*?\)/g, '').replace(/（.*?）/g, '');

    fetch(
      `https://restapi.amap.com/v3/bus/linename?s=rsv3&extensions=all&key=test_claw&output=json&city=全国&offset=20&keywords=${encodeURIComponent(keyword)}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.status === '1' && data.buslines?.length > 0) {
          const parsed: LineInfo[] = data.buslines.map((line: any) => ({
            id: line.id,
            name: line.name,
            startStop: line.start_stop || '',
            endStop: line.end_stop || '',
            startTime: line.start_time || '--',
            endTime: line.end_time || '--',
            interval: line.basic_price || '',
            path: line.polyline
              ? line.polyline.split(';').map((p: string) => {
                  const [lng, lat] = p.split(',').map(Number);
                  return [lng, lat] as [number, number];
                })
              : [],
            stops: (line.busstops || []).map((s: any, i: number) => ({
              name: s.name,
              location: s.location
                ? ([
                    parseFloat(s.location.split(',')[0]),
                    parseFloat(s.location.split(',')[1]),
                  ] as [number, number])
                : undefined,
              sequence: i + 1,
            })),
          }));
          setLines(parsed);
        } else {
          setLines([]);
        }
        setSearched(true);
        setLoading(false);
      })
      .catch(() => {
        message.error('查询线路失败');
        setLoading(false);
      });
  };

  if (!searched && !loading) {
    searchLines();
  }

  const isAdded = (lineId: string) => routes.some((r) => r.id === lineId);

  const handleAdd = (line: LineInfo) => {
    if (isAdded(line.id)) {
      message.info('该路线已添加');
      return;
    }
    const color = nextColor();
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
      interval: line.interval,
      stops: line.stops,
      path: line.path,
      visible: true,
    });
    message.success(`已添加 ${line.name}`);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 20 }}>
        <Spin tip="查询线路中..." />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 8, fontWeight: 600 }}>
        {station.type === 'subway' ? '🔵' : '🟢'} {station.name}
        <span style={{ fontWeight: 400, color: '#999', marginLeft: 8 }}>
          {station.distance}m
        </span>
      </div>
      {lines.length === 0 && searched && (
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
                  {line.startTime}–{line.endTime} | {line.stops.length}站
                </span>
              }
            />
          </List.Item>
        )}
      />
    </div>
  );
}
