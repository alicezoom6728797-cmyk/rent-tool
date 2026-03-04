import { create } from 'zustand';
import { getAMap } from '../services/amapService';
import { parseTimedesc } from '../utils/timedesc';
import type { StationInfo, LineInfo } from '../types';

const COLORS = [
  '#1677ff', '#52c41a', '#fa541c', '#722ed1',
  '#eb2f96', '#faad14', '#13c2c2', '#2f54eb',
  '#f5222d', '#a0d911', '#1890ff', '#fa8c16',
];

let cancelLineLoadingFn: (() => void) | null = null;

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
  loadingProgress: { current: number; total: number } | null;
  selectedLineId: string | null;

  setCity: (c: string) => void;
  setAddress: (addr: string) => void;
  setCenter: (c: [number, number]) => void;
  setRadius: (r: number) => void;
  setStations: (s: StationInfo[]) => void;
  setLines: (l: LineInfo[]) => void;
  updateLine: (id: string, patch: Partial<LineInfo>) => void;
  toggleLineVisible: (id: string) => void;
  toggleAllLines: (type: 'subway' | 'bus', visible: boolean) => void;
  setSelectedLineId: (id: string | null) => void;
  loadLineDetails: (ids: string[]) => void;
  cancelLoading: () => void;
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
  loadingProgress: null,
  selectedLineId: null,

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
  setSelectedLineId: (id) => set({ selectedLineId: id }),
  loadLineDetails: (ids: string[]) => {
    const state = get();
    const AMap = getAMap();
    if (!AMap) {
      set({ loadingProgress: null });
      return;
    }

    let cancelled = false;
    let completed = 0;

    set({ loadingProgress: { current: 0, total: ids.length } });

    cancelLineLoadingFn = () => {
      cancelled = true;
      set({ loadingProgress: null });
    };

    ids.forEach((id) => {
      if (cancelled) return;

      const line = state.lines.find((l) => l.id === id);
      if (!line || line.loaded) {
        completed++;
        set({ loadingProgress: { current: completed, total: ids.length } });
        if (completed >= ids.length) set({ loadingProgress: null });
        return;
      }

      const ls = new AMap.LineSearch({ city: state.city, extensions: 'all' });
      ls.searchById(id, (status: string, result: any) => {
        if (cancelled) return;

        if (status === 'complete' && result.lineInfo?.length > 0) {
          const info = result.lineInfo[0];
          const path = (info.path || []).map((p: any) => [Number(p.lng), Number(p.lat)] as [number, number]);
          const stops = (info.via_stops || []).map((s: any, i: number) => ({
            name: s.name,
            location: s.location ? [Number(s.location.lng), Number(s.location.lat)] as [number, number] : undefined,
            sequence: i + 1,
          }));

          let startTime = '--', endTime = '--', interval = '';
          if (info.timedesc) {
            const t = parseTimedesc(info.timedesc);
            startTime = t.startTime;
            endTime = t.endTime;
            interval = t.interval;
          }

          get().updateLine(id, { path, stops, startTime, endTime, interval, loaded: true });
        }

        completed++;
        set({ loadingProgress: { current: completed, total: ids.length } });
        if (completed >= ids.length) {
          set({ loadingProgress: null });
        }
      });
    });
  },
  cancelLoading: () => {
    if (cancelLineLoadingFn) {
      cancelLineLoadingFn();
      cancelLineLoadingFn = null;
    }
  },
  setLoading: (loading) => set({ loading }),
  setLinesLoading: (linesLoading) => set({ linesLoading }),
  reset: () => set({ stations: [], lines: [], colorIndex: 0, linesLoading: false, selectedLineId: null }),
  nextColor: () => {
    const idx = get().colorIndex;
    set({ colorIndex: (idx + 1) % COLORS.length });
    return COLORS[idx % COLORS.length];
  },
}));
