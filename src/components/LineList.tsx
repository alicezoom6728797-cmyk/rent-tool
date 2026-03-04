import { Switch, Collapse, Tag, Spin, Empty, Typography, Button, Space } from 'antd';
import { useAppStore } from '../stores/appStore';
import { getAMap } from '../services/amapService';
import { parseTimedesc } from '../utils/timedesc';
import type { LineInfo } from '../types';

const { Text } = Typography;

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
      if (startTime === '--' && info.stime) startTime = info.stime;
      if (endTime === '--' && info.etime) endTime = info.etime;
      onDone({ path, stops, startTime, endTime, interval, loaded: true });
    } else {
      onDone({ loaded: true });
    }
  });
}

function LineItem({ line }: { line: LineInfo }) {
  const city = useAppStore((s) => s.city);
  const updateLine = useAppStore((s) => s.updateLine);
  const toggleLineVisible = useAppStore((s) => s.toggleLineVisible);
  const selectedLineId = useAppStore((s) => s.selectedLineId);
  const setSelectedLineId = useAppStore((s) => s.setSelectedLineId);

  const isSelected = selectedLineId === line.id;

  const handleToggle = (checked: boolean) => {
    if (checked && !line.loaded) {
      loadLineDetail(line, city, (patch) => updateLine(line.id, patch));
    }
    toggleLineVisible(line.id);
  };

  const handleClick = () => {
    if (!line.loaded) {
      loadLineDetail(line, city, (patch) => updateLine(line.id, patch));
    }
    setSelectedLineId(isSelected ? null : line.id);
  };

  return (
    <div>
      <div
        onClick={handleClick}
        style={{
          display: 'flex', alignItems: 'center', padding: '8px 8px', gap: 8,
          borderBottom: isSelected ? 'none' : '1px solid #f5f5f5',
          background: isSelected ? `${line.color}12` : 'transparent',
          borderLeft: isSelected ? `3px solid ${line.color}` : '3px solid transparent',
          cursor: 'pointer', borderRadius: isSelected ? '4px 4px 0 0' : 0,
          transition: 'all 0.2s',
        }}
      >
        <Switch size="small" checked={line.visible} onChange={handleToggle}
          onClick={(_, e) => e.stopPropagation()} />
        <div style={{ width: 10, height: 10, borderRadius: line.type === 'subway' ? '50%' : 2,
          background: line.color, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: isSelected ? 600 : 500,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {line.name}
          </div>
          <div style={{ fontSize: 11, color: '#999' }}>
            {line.nearestStation} · {line.nearestDistance}m
          </div>
        </div>
        <Tag color={line.type === 'subway' ? 'blue' : 'green'} style={{ margin: 0, fontSize: 11 }}>
          {line.type === 'subway' ? '地铁' : '公交'}
        </Tag>
      </div>

      {isSelected && (
        <div style={{
          padding: '8px 12px 10px', fontSize: 12, color: '#555',
          background: `${line.color}08`, borderLeft: `3px solid ${line.color}`,
          borderBottom: '1px solid #f0f0f0', borderRadius: '0 0 4px 4px',
        }}>
          {line.startStop && line.endStop && (
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>起终点：</Text>
              <span>{line.startStop} → {line.endStop}</span>
            </div>
          )}
          {line.startTime && line.startTime !== '--' && (
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>运营时间：</Text>
              <span>{line.startTime} - {line.endTime}</span>
            </div>
          )}
          {line.interval && (
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>班次信息：</Text>
              <span>{line.interval}</span>
            </div>
          )}
          {line.loaded && !line.startStop && !line.endStop &&
           (!line.startTime || line.startTime === '--') && !line.interval && (
            <div style={{ marginBottom: 4, color: '#999', fontStyle: 'italic' }}>
              暂无班次信息
            </div>
          )}
          {line.loaded && line.stops.length > 0 && (
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>途经站点（{line.stops.length}站）：</Text>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2, lineHeight: 1.8 }}>
                {line.stops.map((s, i) => (
                  <span key={i}>
                    {i > 0 && <span style={{ margin: '0 2px', color: '#ccc' }}>→</span>}
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          {!line.loaded && (
            <div style={{ color: '#999', fontStyle: 'italic' }}>
              <Spin size="small" style={{ marginRight: 6 }} />加载详情中...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const isRegularBus = (name: string) =>
  /^\d+[A-Za-z]*路/.test(name) || /^[A-Za-z]\d+路/.test(name);

export default function LineList() {
  const lines = useAppStore((s) => s.lines);
  const linesLoading = useAppStore((s) => s.linesLoading);
  const toggleAllLines = useAppStore((s) => s.toggleAllLines);
  const loadLineDetails = useAppStore((s) => s.loadLineDetails);

  const subwayLines = lines.filter((l) => l.type === 'subway');
  const busLines = lines.filter((l) => l.type === 'bus');
  const regularBusLines = busLines.filter((l) => isRegularBus(l.name));
  const specialBusLines = busLines.filter((l) => !isRegularBus(l.name));

  const handleSelectAll = (type: 'subway' | 'bus') => {
    const targetLines = type === 'subway' ? subwayLines : busLines;
    const unloadedIds = targetLines.filter((l) => !l.loaded).map((l) => l.id);
    if (unloadedIds.length > 0) {
      loadLineDetails(unloadedIds);
    }
    toggleAllLines(type, true);
  };

  const handleSelectAllGroup = (groupLines: LineInfo[]) => {
    const unloadedIds = groupLines.filter((l) => !l.loaded).map((l) => l.id);
    if (unloadedIds.length > 0) loadLineDetails(unloadedIds);
    groupLines.forEach((l) => {
      if (!l.visible) useAppStore.getState().toggleLineVisible(l.id);
    });
  };

  const handleClearGroup = (groupLines: LineInfo[]) => {
    groupLines.forEach((l) => {
      if (l.visible) useAppStore.getState().toggleLineVisible(l.id);
    });
  };

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
            label: (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong>🚇 地铁线路 ({subwayLines.length})</Text>
                <Space size={4} onClick={(e) => e.stopPropagation()}>
                  <Button size="small" type="link" onClick={() => handleSelectAll('subway')}>全选</Button>
                  <Button size="small" type="link" onClick={() => toggleAllLines('subway', false)}>清空</Button>
                </Space>
              </div>
            ),
            children: subwayLines.map((l) => <LineItem key={l.id} line={l} />),
          }]}
        />
      )}

      {regularBusLines.length > 0 && (
        <Collapse size="small" defaultActiveKey={['bus']} ghost
          items={[{
            key: 'bus',
            label: (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong>🚌 常规公交 ({regularBusLines.length})</Text>
                <Space size={4} onClick={(e) => e.stopPropagation()}>
                  <Button size="small" type="link" onClick={() => handleSelectAllGroup(regularBusLines)}>全选</Button>
                  <Button size="small" type="link" onClick={() => handleClearGroup(regularBusLines)}>清空</Button>
                </Space>
              </div>
            ),
            children: regularBusLines.map((l) => <LineItem key={l.id} line={l} />),
          }]}
        />
      )}

      {specialBusLines.length > 0 && (
        <Collapse size="small" defaultActiveKey={[]} ghost
          items={[{
            key: 'special',
            label: (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong style={{ color: '#999' }}>🚐 专线/长途 ({specialBusLines.length})</Text>
                <Space size={4} onClick={(e) => e.stopPropagation()}>
                  <Button size="small" type="link" onClick={() => handleSelectAllGroup(specialBusLines)}>全选</Button>
                  <Button size="small" type="link" onClick={() => handleClearGroup(specialBusLines)}>清空</Button>
                </Space>
              </div>
            ),
            children: specialBusLines.map((l) => <LineItem key={l.id} line={l} />),
          }]}
        />
      )}
    </div>
  );
}
