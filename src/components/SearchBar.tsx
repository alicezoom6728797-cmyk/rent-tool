import { useState, useRef, useCallback } from 'react';
import { AutoComplete, Cascader, message, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { getAMap, getMap } from '../services/amapService';
import { useAppStore } from '../stores/appStore';
import type { LineInfo, StationInfo } from '../types';

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

// 批量查站点线路，去重聚合
function fetchAllLines(
  stations: StationInfo[], city: string, AMap: any,
  onProgress: (lines: LineInfo[], done: boolean) => void,
  getColor: () => string,
) {
  // 对站点名去重（去掉出口后缀），只查唯一站名
  const stationMap = new Map<string, StationInfo>();
  stations.forEach((s) => {
    const key = s.name.replace(/\(.*?\)/g, '').replace(/（.*?）/g, '')
      .replace(/地铁站.*口$/, '').replace(/(地铁站|公交站)$/, '')
      .replace(/[A-Z]?\d*(东南|西南|东北|西北|东|南|西|北)?口$/, '');
    if (!stationMap.has(key) || s.distance < stationMap.get(key)!.distance) {
      stationMap.set(key, s);
    }
  });

  const uniqueStations = [...stationMap.entries()];
  const allLines = new Map<string, LineInfo>();
  let completed = 0;

  uniqueStations.forEach(([keyword, station]) => {
    const ss = new AMap.StationSearch({ city });
    ss.search(keyword, (status: string, result: any) => {
      if (status === 'complete' && result.stationInfo?.length > 0) {
        result.stationInfo.forEach((si: any) => {
          (si.buslines || []).forEach((line: any) => {
            if (allLines.has(line.id)) {
              // 如果已有，更新最近距离
              const existing = allLines.get(line.id)!;
              if (station.distance < existing.nearestDistance) {
                existing.nearestStation = station.name;
                existing.nearestDistance = station.distance;
              }
            } else {
              const isSubway = line.name.includes('地铁') || line.name.includes('号线');
              allLines.set(line.id, {
                id: line.id,
                name: line.name,
                type: isSubway ? 'subway' : 'bus',
                nearestStation: station.name,
                nearestDistance: station.distance,
                startStop: line.start_stop || '',
                endStop: line.end_stop || '',
                startTime: '', endTime: '', interval: '',
                stops: [], path: [],
                color: getColor(),
                visible: isSubway, // 地铁默认显示
                loaded: false,
              });
            }
          });
        });
      }
      completed++;
      const sorted = [...allLines.values()].sort((a, b) => {
        if (a.type !== b.type) return a.type === 'subway' ? -1 : 1;
        return a.nearestDistance - b.nearestDistance;
      });
      onProgress(sorted, completed >= uniqueStations.length);
    });
  });
}

export default function SearchBar() {
  const { setCenter, setAddress, setStations, setLines, setLoading, setLinesLoading,
    radius, reset, city, setCity, nextColor } = useAppStore();
  const [inputVal, setInputVal] = useState('');
  const [suggestions, setSuggestions] = useState<{ value: string; label: string }[]>([]);
  const timerRef = useRef<any>(null);
  const searchingRef = useRef(false);

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
          result.tips.filter((t: any) => t.name && t.location).slice(0, 8)
            .map((t: any) => ({ value: t.district + t.name, label: `${t.name}  ${t.district}` }))
        );
      }
    });
  }, [city]);

  const handleInputChange = (val: string) => {
    setInputVal(val);
    if (searchingRef.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const handleSearch = (value: string) => {
    if (!value.trim()) return;
    setSuggestions([]);
    setLoading(true);
    reset();
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
        searchNearbyStations(center, radius, AMap);
      } else {
        message.error('地址解析失败，请尝试更详细的地址');
        setLoading(false);
      }
    });
  };

  const searchNearbyStations = (center: [number, number], r: number, AMap: any) => {
    const allStations: StationInfo[] = [];
    let completed = 0;
    const types = [
      { code: '150500', type: 'subway' as const },
      { code: '150700', type: 'bus' as const },
    ];
    types.forEach(({ code, type }) => {
      const ps = new AMap.PlaceSearch({ type: code, pageSize: 50, pageIndex: 1 });
      ps.searchNearBy('', center, r, (status: string, result: any) => {
        if (status === 'complete' && result.poiList?.pois) {
          result.poiList.pois.forEach((poi: any) => {
            allStations.push({
              id: poi.id, name: poi.name,
              location: [poi.location.lng, poi.location.lat],
              type, distance: Math.round(AMap.GeometryUtil.distance(center, [poi.location.lng, poi.location.lat])),
            });
          });
        }
        completed++;
        if (completed >= types.length) {
          allStations.sort((a, b) => a.distance - b.distance);
          setStations(allStations);
          setLoading(false);
          searchingRef.current = false;
          // 自动查所有线路
          setLinesLoading(true);
          fetchAllLines(allStations, city, AMap, (lines, done) => {
            setLines(lines);
            if (done) setLinesLoading(false);
          }, nextColor);
        }
      });
    });
  };

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <Cascader options={CITY_OPTIONS} value={getCityPath()} onChange={handleCityChange}
        allowClear={false} style={{ width: 180 }} size="large" placeholder="选择城市" />
      <AutoComplete style={{ flex: 1 }} options={suggestions} value={inputVal}
        onChange={handleInputChange} popupMatchSelectWidth={true}
        onSelect={(val) => { searchingRef.current = true; clearTimeout(timerRef.current); setInputVal(val); handleSearch(val); }}>
        <Input size="large" placeholder="输入地址搜索，如：西湖文化广场"
          onPressEnter={() => handleSearch(inputVal)}
          suffix={<SearchOutlined style={{ cursor: 'pointer', color: '#1677ff' }} onClick={() => handleSearch(inputVal)} />} />
      </AutoComplete>
    </div>
  );
}
