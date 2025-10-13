import type { PrimusAPI } from '../../main/preload';

declare global {
  interface Window {
    primus: PrimusAPI;
    electronAPI: any;
  }
}
