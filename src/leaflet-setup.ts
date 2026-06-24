import * as L from 'leaflet';

if (typeof window !== 'undefined') {
  const leafletObj = (L as any).default || L;
  
  // Local object to store any runtime extensions added by plugins
  const pluginExtensions: any = {};

  const proxyL = new Proxy(leafletObj, {
    get(target: any, prop: string | symbol) {
      if (prop in pluginExtensions) {
        return pluginExtensions[prop];
      }
      return target[prop];
    },
    set(target: any, prop: string | symbol, value: any) {
      pluginExtensions[prop] = value;
      return true;
    },
    has(target: any, prop: string | symbol) {
      return prop in pluginExtensions || prop in target;
    }
  });

  (window as any).L = proxyL;
}