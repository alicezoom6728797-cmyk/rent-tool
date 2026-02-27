import { List, Tag, Typography, Empty, Spin } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
import { useAppStore } from '../stores/appStore';
import type { StationInfo } from '../types';

const { Text } = Typography;

interface Props {
  onStationClick: (station: StationInfo) => void;
}

export default function StationList({ onStationClick }: Props) {
  const { stations, selectedStation, loading } = useAppStore();

  const subwayStations = stations.filter((s) => s.type === 'subway');
  const busStations = stations.filter((s) => s.type === 'bus');

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin tip="搜索中..." />
      </div>
    );
  }

  if (stations.length === 0) {
    return <Empty description="搜索地址后显示周边站点" />;
  }

  const renderStation = (station: StationInfo) => {
    const isSelected = selectedStation?.id === station.id;
    return (
      <List.Item
        key={station.id}
        onClick={() => onStationClick(station)}
        style={{
          cursor: 'pointer',
          background: isSelected ? '#e6f4ff' : 'transparent',
          padding: '8px 12px',
          borderRadius: 6,
        }}
      >
        <div style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text strong style={{ fontSize: 14 }}>
              {station.type === 'subway' ? '🔵 ' : '🟢 '}
              {station.name}
            </Text>
            <Tag color={station.type === 'subway' ? 'blue' : 'green'}>
              {station.distance}m
            </Tag>
          </div>
        </div>
      </List.Item>
    );
  };

  return (
    <div style={{ overflow: 'auto', height: '100%' }}>
      {subwayStations.length > 0 && (
        <>
          <Text type="secondary" style={{ padding: '8px 12px', display: 'block' }}>
            <EnvironmentOutlined /> 地铁站 ({subwayStations.length})
          </Text>
          <List
            dataSource={subwayStations}
            renderItem={renderStation}
            split={false}
            size="small"
          />
        </>
      )}
      {busStations.length > 0 && (
        <>
          <Text type="secondary" style={{ padding: '8px 12px', display: 'block', marginTop: 8 }}>
            <EnvironmentOutlined /> 公交站 ({busStations.length})
          </Text>
          <List
            dataSource={busStations}
            renderItem={renderStation}
            split={false}
            size="small"
          />
        </>
      )}
    </div>
  );
}
