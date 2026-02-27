import { useState } from 'react';
import { Input, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { getAMap, getMap } from '../services/amapService';
import { useAppStore } from '../stores/appStore';

const { Search } = Input;

export default function SearchBar() {
  const { setCenter, setAddress, setStations, setLoading, radius, clearRoutes } =
    useAppStore();
  const [inputVal, setInputVal] = useState('');

  const handleSearch = async (value: string) => {
    if (!value.trim()) return;
    setLoading(true);
    clearRoutes();
    const AMap = getAMap();
    if (!AMap) {
      message.error('地图尚未加载');
      setLoading(false);
      return;
    }

    const geocoder = new AMap.Geocoder();
    geocoder.getLocation(value, (status: string, result: any) => {
      if (status === 'complete' && result.geocodes?.length > 0) {
        const { lng, lat } = result.geocodes[0].location;
        const center: [number, number] = [lng, lat];
        setCenter(center);
        setAddress(value);

        const map = getMap();
        map.setCenter(center);
        map.setZoom(15);
        map.clearMap();
        new AMap.Marker({
          position: center,
          map,
          title: value,
          zIndex: 200,
        });

        searchNearbyStations(center, radius, AMap);
      } else {
        message.error('地址解析失败，请尝试更详细的地址');
        setLoading(false);
      }
    });
  };

  const searchNearbyStations = (
    center: [number, number],
    radius: number,
    AMap: any,
  ) => {
    const allStations: any[] = [];
    let completed = 0;

    const types = [
      { code: '150500', type: 'subway' as const },
      { code: '150700', type: 'bus' as const },
    ];

    types.forEach(({ code, type }) => {
      const ps = new AMap.PlaceSearch({
        type: code,
        pageSize: 50,
        pageIndex: 1,
      });

      ps.searchNearBy('', center, radius, (status: string, result: any) => {
        completed++;
        if (status === 'complete' && result.poiList?.pois) {
          result.poiList.pois.forEach((poi: any) => {
            allStations.push({
              id: poi.id,
              name: poi.name,
              location: [poi.location.lng, poi.location.lat] as [number, number],
              type,
              distance: Math.round(
                AMap.GeometryUtil.distance(center, [poi.location.lng, poi.location.lat])
              ),
              address: poi.address,
            });
          });
        }
        if (completed === types.length) {
          allStations.sort((a, b) => a.distance - b.distance);
          setStations(allStations);
          setLoading(false);
        }
      });
    });
  };

  return (
    <Search
      placeholder="输入地址搜索，如：北京市朝阳区望京SOHO"
      enterButton={<SearchOutlined />}
      size="large"
      value={inputVal}
      onChange={(e) => setInputVal(e.target.value)}
      onSearch={handleSearch}
      style={{ width: '100%' }}
    />
  );
}
