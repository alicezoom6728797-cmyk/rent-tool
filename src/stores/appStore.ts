import { create } from 'zustand';
import type { StationInfo, LineInfo } from '../types';

const COLORS = [
  '#1677ff', '#52c41a', '#fa541c', '#722ed1',
  '#eb2f96', '#faad14', '#13c2c2', '#2f54eb',
  '#f5222d', '#a0d911', '#1890ff', '#fa8c16',
];

interface AppState {
  city: string;
  address: string;
  center: [number, number] | null;
  radius: number;
  stations: StationInfo[];
  lines: LineInfo[];
  loading: boolean;
  linesLoading: boolean;
  colorIndex: number;

  setCity: (c: string) => void;
  setAddress: (addr: string) => void;
  setCenter: (c: [number, number]) => void;
  setRadius: (r: number) => void;
  setStations: (s: StationInfo[]) => void;
  setLines: (l: LineInfo[]) => void;
  updateLine: (id: string, patch: Partial<LineInfo>) => void;
  toggleLineVisible: (id: string) => void;
  toggleAllLines: (type: 'subway' | 'bus', visible: boolean) => void;
  loadLineDetails: (ids: string[]) => void;
  setLoading: (l: boolean) => void;
  setLinesLoading: (l: boolean) => void;
  reset: () => void;
  nextColor: () => string;
}

export const useAppStore = create<AppState>((set, get) => ({
  city: '杭州',
  address: '',
  center: null,
  radius: 1000,
  stations: [],
  lines: [],
  loading: false,
  linesLoading: false,
  colorIndex: 0,

  setCity: (city) => set({ city }),
  setAddress: (address) => set({ address }),
  setCenter: (center) => set({ center }),
  setRadius: (radius) => set({ radius }),
  setStations: (stations) => set({ stations }),
  setLines: (lines) => set({ lines }),
  updateLine: (id, patch) => set((s) => ({
    lines: s.lines.map((l) => l.id === id ? { ...l, ...patch } : l),
  })),
  toggleLineVisible: (id) => set((s) => ({
    lines: s.lines.map((l) => l.id === id ? { ...l, visible: !l.visible } : l),
  })),
  toggleAllLines: (type: 'subway' | 'bus', visible: boolean) => set((s) => ({
    lines: s.lines.map((l) => l.type === type ? { ...l, visible } : l),
  })),
  loadLineDetails: (ids: string[]) => {
    const state = get();
    ids.forEach((id) => {
      const line = state.lines.find((l) => l.id === id);
      if (!line || line.loaded) return;
      
      const AMap = (window as any).AMap;
      if (!AMap) return;
      
      const ls = new AMap.LineSearch({ city: state.city, extensions: 'all' });
      ls.searchById(id, (status: string, result: any) => {
        if (status === 'complete' && result.lineInfo?.length > 0) {
          const info = result.lineInfo[0];
          const path = (info.path || []).map((p: any) => [Number(p.lng), Number(p.lat)] as [number, number]);
          const stops = (info.via_stops || []).map((s: any, i: number) => ({
            name: s.name,
            location: s.location ? [Number(s.location.lng), Number(s.location.lat)] as [number, number] : undefined,
            sequence: i + 1,
          }));
          
          let startTime = '--', endTime = '--';
          if (info.timedesc) {
            try {
              const data = JSON.parse(decodeURIComponent(info.timedesc));
              const remark = data.allRemark || data.rule_group?.[0]?.remark || '';
              const times = remark.match(/(\d{2}:\d{2})/g);
              if (times && times.length >= 2) {
                startTime = times[0];
                endTime = times[times.length - 1];
              }
            } catch {}
          }
          
          get().updateLine(id, { path, stops, startTime, endTime, loaded: true });
        }
      });
    });
  },
  setLoading: (loading) => set({ loading }),
  setLinesLoading: (linesLoading) => set({ linesLoading }),
  reset: () => set({ stations: [], lines: [], colorIndex: 0, linesLoading: false }),
  nextColor: () => {
    const idx = get().colorIndex;
    set({ colorIndex: (idx + 1) % COLORS.length });
    return COLORS[idx % COLORS.length];
  },
}));
