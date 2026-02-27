import { List, Button, Switch, Tag, Typography, Empty, Collapse } from 'antd';
import { DeleteOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { useAppStore } from '../stores/appStore';

const { Text } = Typography;

export default function RoutePanel() {
  const { routes, removeRoute, toggleRouteVisible, clearRoutes } = useAppStore();

  if (routes.length === 0) {
    return (
      <Empty
        description="点击站点添加路线"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text strong>已选路线 ({routes.length})</Text>
        <Button size="small" danger onClick={clearRoutes}>
          清空
        </Button>
      </div>
      <List
        dataSource={routes}
        size="small"
        split={false}
        renderItem={(route) => (
          <List.Item
            style={{ padding: '6px 0' }}
            actions={[
              <Button
                size="small"
                type="text"
                icon={route.visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                onClick={() => toggleRouteVisible(route.id)}
              />,
              <Button
                size="small"
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => removeRoute(route.id)}
              />,
            ]}
          >
            <div style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div
                  style={{
                    width: 12,
                    height: 4,
                    borderRadius: 2,
                    background: route.color,
                  }}
                />
                <Text style={{ fontSize: 13 }} delete={!route.visible}>
                  {route.name}
                </Text>
              </div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {route.startTime}–{route.endTime} | {route.stops.length}站
              </Text>
            </div>
          </List.Item>
        )}
      />
    </div>
  );
}
