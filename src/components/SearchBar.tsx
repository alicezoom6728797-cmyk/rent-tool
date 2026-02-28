import { useState, useRef, useCallback } from 'react';
import { AutoComplete, Cascader, message, Button, Space, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { getAMap, getMap } from '../services/amapService';
import { useAppStore } from '../stores/appStore';

const CITY_OPTIONS = [
  { value: '浙江', label: '浙江', children: [
    { value: '杭州', label: '杭州' }, { value: '宁波', label: '宁波' },
    { value: '温州', label: '温州' }, { value: '嘉兴', label: '嘉兴' },
    { value: '湖州', label: '湖州' }, { value: '绍兴', label: '绍兴' },
    { value: '金华', label: '金华' }, { value: '台州', label: '台州' },
  ]},
  { value: '北京', label: '北京', children: [{ value: '北京', label: '北京' }] },
  { value: '上海', label: '上海', children: [{ value: '上海', label: '上海' }] },
  { value: '广东', label: '广东', children: [
    { value: '广州', label: '广州' }, { value: '深圳', label: '深圳' },
    { value: '东莞', label: '东莞' }, { value: '佛山', label: '佛山' },
  ]},
  { value: '江苏', label: '江苏', children: [
    { value: '南京', label: '南京' }, { value: '苏州', label: '苏州' },
    { value: '无锡', label: '无锡' }, { value: '常州', label: '常州' },
  ]},
  { value: '四川', label: '四川', children: [{ value: '成都', label: '成都' }] },
  { value: '湖北', label: '湖北', children: [{ value: '武汉', label: '武汉' }] },
  { value: '湖南', label: '湖南', children: [{ value: '长沙', label: '长沙' }] },
  { value: '福建', label: '福建', children: [
    { value: '福州', label: '福州' }, { value: '厦门', label: '厦门' },
  ]},
  { value: '重庆', label: '重庆', children: [{ value: '重庆', label: '重庆' }] },
  { value: '天津', label: '天津', children: [{ value: '天津', label: '天津' }] },
];

export default function SearchBar() {
  const { setCenter, setAddress, setStations, setLoading, radius, clearRoutes, city, setCity } = useAppStore();
  const [inputVal, setInputVal] = useState('');
  const [suggestions, setSuggestions] = useState<{ value: string; label: string }[]>([]);
  const timerRef = useRef<any>(null);

  const getCityPath = (): string[] => {
    for (const p of CITY_OPTIONS) {
      const c = p.children?.find((ch) => ch.value === city);
      if (c) return [p.value, c.value];
    }
    return ['浙江', '杭州'];
  };

  const handleCityChange = (val: (string | number)[]) => {
    if (val && val.length === 2) setCity(String(val[1]));
  };

  const fetchSuggestions = useCallback((keyword: string) => {
    if (!keyword.trim()) { setSuggestions([]); return; }
    const AMap = getAMap();
    if (!AMap) return;
    const ac = new AMap.Autocomplete({ city });
    ac.search(keyword, (_status: string, result: any) => {
      if (result?.tips) {
        setSuggestions(
          result.tips
            .filter((t: any) => t.name && t.location)
            .slice(0, 8)
            .map((t: any) => ({
              value: t.district + t.name,
              label: `${t.name}  ${t.district}`,
            }))
        );
      }
    });
  }, [city]);

  const handleInputChange = (val: string) => {
    setInputVal(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const handleSearch = (value: string) => {
    if (!value.trim()) return;
    setSuggestions([]);
    setLoading(true);
    clearRoutes();
    const AMap = getAMap();
    if (!AMap) { message.error('地图尚未加载'); setLoading(false); return; }

    const geocoder = new AMap.Geocoder({ city });
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
        new AMap.Marker({ position: center, map, title: value, zIndex: 200 });
        searchNearbyStations(center, radius, AMap);
      } else {
        message.error('地址解析失败，请尝试更详细的地址');
        setLoading(false);
      }
    });
  };

  const searchNearbyStations = (center: [number, number], radius: number, AMap: any) => {
    const allStations: any[] = [];
    let completed = 0;
    const types = [
      { code: '150500', type: 'subway' as const },
      { code: '150700', type: 'bus' as const },
    ];
    types.forEach(({ code, type }) => {
      const ps = new AMap.PlaceSearch({ type: code, pageSize: 50, pageIndex: 1 });
      ps.searchNearBy('', center, radius, (status: string, result: any) => {
        completed++;
        if (status === 'complete' && result.poiList?.pois) {
          result.poiList.pois.forEach((poi: any) => {
            allStations.push({
              id: poi.id, name: poi.name,
              location: [poi.location.lng, poi.location.lat] as [number, number],
              type, distance: Math.round(AMap.GeometryUtil.distance(center, [poi.location.lng, poi.location.lat])),
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
    <Space.Compact style={{ width: '100%' }} size="large">
      <Cascader
        options={CITY_OPTIONS}
        value={getCityPath()}
        onChange={handleCityChange}
        allowClear={false}
        style={{ width: 180 }}
        placeholder="选择城市"
      />
      <AutoComplete
        style={{ flex: 1 }}
        options={suggestions}
        value={inputVal}
        onChange={handleInputChange}
        onSelect={(val) => { setInputVal(val); handleSearch(val); }}
      >
        <Input
          size="large"
          placeholder="输入地址搜索，如：西湖文化广场"
          onPressEnter={() => handleSearch(inputVal)}
          suffix={<SearchOutlined style={{ cursor: 'pointer', color: '#1677ff' }} onClick={() => handleSearch(inputVal)} />}
        />
      </AutoComplete>
    </Space.Compact>
  );
}
