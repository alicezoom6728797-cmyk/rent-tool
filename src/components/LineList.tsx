import { Switch, Collapse, Tag, Spin, Empty, Typography } from 'antd';
import { useAppStore } from '../stores/appStore';
import { getAMap } from '../services/amapService';
import type { LineInfo } from '../types';

const { Text } = Typography;

function parseTimedesc(timedesc: string): { startTime: string; endTime: string; interval: string } {
  try {
    const data = JSON.parse(decodeURIComponent(timedesc));
    const remark = data.allRemark || data.rule_group?.[0]?.remark || '';
    const times = remark.match(/(\d{2}:\d{2})/g);
    if (times && times.length >= 2) {
      return { startTime: times[0], endTime: times[times.length - 1], interval: remark.replace(/\\r\\n/g, ' | ') };
    }
  } catch {}
  return { startTime: '--', endTime: '--', interval: '' };
}

// 懒加载线路完整数据（路径+站点+时刻）
function loadLineDetail(line: LineInfo, city: string, onDone: (patch: Partial<LineInfo>) => void) {
  const AMap = getAMap();
  if (!AMap) return;
  const ls = new AMap.LineSearch({ city, extensions: 'all' });
  ls.searchById(line.id, (status: string, result: any) => {
    if (status === 'complete' && result.lineInfo?.length > 0) {
      const info = result.lineInfo[0];
      const path = (info.path || []).map((p: any) => [Number(p.lng), Number(p.lat)] as [number, number]);
      const stops = (info.via_stops || []).map((s: any, i: number) => ({
        name: s.name,
        location: s.location ? [Number(s.location.lng), Number(s.location.lat)] as [number, number] : undefined,
        sequence: i + 1,
      }));
      let startTime = '--', endTime = '--', interval = '';
      if (info.timedesc) {
        const t = parseTimedesc(info.timedesc);
        startTime = t.startTime; endTime = t.endTime; interval = t.interval;
      }
      onDone({ path, stops, startTime, endTime, interval, loaded: true });
    } else {
      onDone({ loaded: true });
    }
  });
}

function LineItem({ line }: { line: LineInfo }) {
  const { toggleLineVisible, updateLine, city } = useAppStore();

  const handleToggle = (checked: boolean) => {
    toggleLineVisible(line.id);
    // 首次开启时懒加载完整路线数据
    if (checked && !line.loaded) {
      loadLineDetail(line, city, (patch) => updateLine(line.id, patch));
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '8px 0', gap: 8, borderBottom: '1px solid #f5f5f5' }}>
      <Switch size="small" checked={line.visible} onChange={handleToggle} />
      <div style={{ width: 10, height: 10, borderRadius: line.type === 'subway' ? '50%' : 2,
        background: line.color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {line.name}
        </div>
        <div style={{ fontSize: 11, color: '#999' }}>
          {line.nearestStation} · {line.nearestDistance}m
          {line.startTime && line.startTime !== '--' && ` · ${line.startTime}-${line.endTime}`}
        </div>
      </div>
      <Tag color={line.type === 'subway' ? 'blue' : 'green'} style={{ margin: 0, fontSize: 11 }}>
        {line.type === 'subway' ? '地铁' : '公交'}
      </Tag>
    </div>
  );
}

export default function LineList() {
  const { lines, linesLoading } = useAppStore();

  const subwayLines = lines.filter((l) => l.type === 'subway');
  const busLines = lines.filter((l) => l.type === 'bus');

  if (lines.length === 0 && !linesLoading) {
    return <Empty description="搜索地址后自动查询周边线路" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  return (
    <div>
      {linesLoading && (
        <div style={{ textAlign: 'center', padding: 12 }}>
          <Spin size="small" /> <Text type="secondary" style={{ marginLeft: 8 }}>正在查询线路...</Text>
        </div>
      )}

      {subwayLines.length > 0 && (
        <Collapse size="small" defaultActiveKey={['subway']} ghost
          items={[{
            key: 'subway',
            label: <Text strong>🚇 地铁线路 ({subwayLines.length})</Text>,
            children: subwayLines.map((l) => <LineItem key={l.id} line={l} />),
          }]}
        />
      )}

      {busLines.length > 0 && (
        <Collapse size="small" defaultActiveKey={[]} ghost
          items={[{
            key: 'bus',
            label: <Text strong>🚌 公交线路 ({busLines.length})</Text>,
            children: busLines.map((l) => <LineItem key={l.id} line={l} />),
          }]}
        />
      )}
    </div>
  );
}
