export interface StationInfo {
  id: string;
  name: string;
  location: [number, number]; // [lng, lat]
  type: 'subway' | 'bus';
  distance: number; // 米
  address?: string;
}

export interface RouteInfo {
  id: string;
  name: string;
  stationId: string;
  stationName: string;
  type: 'subway' | 'bus';
  color: string;
  startStop: string;
  endStop: string;
  startTime: string;
  endTime: string;
  interval?: string;
  stops: StopInfo[];
  path?: [number, number][];
  visible: boolean;
}

export interface StopInfo {
  name: string;
  location?: [number, number];
  sequence: number;
}

export interface SearchState {
  address: string;
  center: [number, number] | null;
  radius: number;
  stations: StationInfo[];
  selectedStation: StationInfo | null;
  routes: RouteInfo[];
  loading: boolean;
}

export const ROUTE_COLORS = [
  '#1677ff', '#52c41a', '#fa541c', '#722ed1',
  '#eb2f96', '#faad14', '#13c2c2', '#2f54eb',
];
