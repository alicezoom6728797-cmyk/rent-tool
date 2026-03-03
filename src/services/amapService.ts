import AMapLoader from '@amap/amap-jsapi-loader';

const AMAP_KEY = import.meta.env.VITE_AMAP_KEY as string;
const AMAP_SECRET = import.meta.env.VITE_AMAP_SECRET as string;

let mapInstance: any = null;
let AMapGlobal: any = null;
let mapReady = false;
let readyCallbacks: (() => void)[] = [];

export async function initAMap(container: string | HTMLElement): Promise<any> {
  (window as any)._AMapSecurityConfig = { securityJsCode: AMAP_SECRET };
  AMapGlobal = await AMapLoader.load({
    key: AMAP_KEY,
    version: '1.4.15',
    plugins: [
      'AMap.Geocoder', 'AMap.PlaceSearch', 'AMap.Walking',
      'AMap.Autocomplete', 'AMap.LineSearch', 'AMap.StationSearch',
    ],
  });
  mapInstance = new AMapGlobal.Map(container, {
    zoom: 14, center: [116.397428, 39.90923], viewMode: '2D',
  });
  mapReady = true;
  readyCallbacks.forEach((cb) => cb());
  readyCallbacks = [];
  return { map: mapInstance, AMap: AMapGlobal };
}

export function getAMap() { return AMapGlobal; }
export function getMap() { return mapInstance; }
export function isMapReady() { return mapReady; }
export function onMapReady(cb: () => void) {
  if (mapReady) cb();
  else readyCallbacks.push(cb);
}
