import { useState, useCallback } from 'react';
import { ConfigProvider, Divider, Typography } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import MapContainer from './components/MapContainer';
import SearchBar from './components/SearchBar';
import StationList from './components/StationList';
import StationDetail from './components/StationDetail';
import RoutePanel from './components/RoutePanel';
import RouteDetail from './components/RouteDetail';
import RadiusControl from './components/RadiusControl';
import { useMapMarkers } from './hooks/useMapMarkers';
import { useAppStore } from './stores/appStore';
import type { StationInfo, RouteInfo } from './types';

const { Title } = Typography;

function AppContent() {
  const { selectedStation, setSelectedStation, addRoute, routes } = useAppStore();

  const handleStationClick = useCallback((station: StationInfo) => {
    setSelectedStation(station);
  }, [setSelectedStation]);

  const handleRouteAdd = useCallback((route: RouteInfo) => {
    addRoute(route);
  }, [addRoute]);

  useMapMarkers(handleStationClick);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* 左侧面板 */}
      <div
        style={{
          width: 360,
          minWidth: 360,
          background: '#fff',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #f0f0f0',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: 16, borderBottom: '1px solid #f0f0f0' }}>
          <Title level={4} style={{ margin: '0 0 12px 0' }}>
            🏠 租房交通助手
          </Title>
          <SearchBar />
          <div style={{ marginTop: 12 }}>
            <RadiusControl />
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>
          <StationList onStationClick={handleStationClick} />

          {selectedStation && (
            <>
              <Divider style={{ margin: '12px 0' }} />
              <StationDetail
                station={selectedStation}
                onRouteAdd={handleRouteAdd}
              />
            </>
          )}

          {routes.length > 0 && (
            <>
              <Divider style={{ margin: '12px 0' }} />
              <RoutePanel />
            </>
          )}
        </div>
      </div>

      {/* 右侧地图 */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer onMapReady={() => {}} />

        {/* 底部路线详情 */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            maxHeight: '40%',
            overflow: 'auto',
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(8px)',
            borderTop: '1px solid #f0f0f0',
          }}
        >
          <RouteDetail />
        </div>
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
