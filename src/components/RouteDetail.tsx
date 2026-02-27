import { Collapse, Tag, Typography } from 'antd';
import { useAppStore } from '../stores/appStore';

const { Text } = Typography;

export default function RouteDetail() {
  const { routes } = useAppStore();
  const visibleRoutes = routes.filter((r) => r.visible);

  if (visibleRoutes.length === 0) return null;

  return (
    <div style={{ padding: '8px 0' }}>
      <Collapse
        size="small"
        items={visibleRoutes.map((route) => ({
          key: route.id,
          label: (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 14,
                  height: 4,
                  borderRadius: 2,
                  background: route.color,
                }}
              />
              <span>{route.name}</span>
              <Tag color={route.type === 'subway' ? 'blue' : 'green'} style={{ marginLeft: 'auto' }}>
                {route.stops.length}站
              </Tag>
            </div>
          ),
          children: (
            <div>
              <div style={{ marginBottom: 8, fontSize: 12, color: '#666' }}>
                <div>首末站：{route.startStop} → {route.endStop}</div>
                <div>运营时间：{route.startTime} – {route.endTime}</div>
                {route.interval && <div>票价：{route.interval}</div>}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {route.stops.map((stop, i) => (
                  <Tag
                    key={i}
                    style={{ fontSize: 11, margin: 0 }}
                    color={stop.name.includes(route.stationName.replace(/\(.*?\)/g, '').split('(')[0]) ? route.color : undefined}
                  >
                    {stop.name}
                  </Tag>
                ))}
              </div>
            </div>
          ),
        }))}
      />
    </div>
  );
}
