import { ConfigProvider, Typography } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import MapContainer from './components/MapContainer';
import SearchBar from './components/SearchBar';
import LineList from './components/LineList';
import RadiusControl from './components/RadiusControl';
import { useMapMarkers } from './hooks/useMapMarkers';

const { Title } = Typography;

function AppContent() {
  useMapMarkers();

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <div style={{
        width: 380, minWidth: 380, background: '#fff',
        display: 'flex', flexDirection: 'column',
        borderRight: '1px solid #f0f0f0', overflow: 'hidden',
      }}>
        <div style={{ padding: 16, borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Title level={4} style={{ margin: 0 }}>🏠 租房交通助手</Title>
            <span style={{ fontSize: 12, color: '#999' }}>v0.0.1</span>
          </div>
          <SearchBar />
          <div style={{ marginTop: 12 }}><RadiusControl /></div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '0 4px' }}>
          <LineList />
        </div>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer onMapReady={() => {}} />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <AppContent />
    </ConfigProvider>
  );
}
