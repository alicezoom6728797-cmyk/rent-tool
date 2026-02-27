import { Slider, Typography } from 'antd';
import { useAppStore } from '../stores/appStore';

const { Text } = Typography;

const marks: Record<number, string> = {
  500: '500m',
  1000: '1km',
  1500: '1.5km',
  2000: '2km',
};

export default function RadiusControl() {
  const { radius, setRadius } = useAppStore();

  return (
    <div style={{ padding: '0 8px' }}>
      <Text type="secondary" style={{ fontSize: 12 }}>
        搜索半径：{radius >= 1000 ? `${radius / 1000}km` : `${radius}m`}
      </Text>
      <Slider
        min={500}
        max={2000}
        step={100}
        marks={marks}
        value={radius}
        onChange={setRadius}
        tooltip={{ formatter: (v) => (v && v >= 1000 ? `${v / 1000}km` : `${v}m`) }}
      />
    </div>
  );
}
