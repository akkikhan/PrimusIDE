import type { PrimusAPI } from '../main/preload';

declare global {
  interface Window {
    primus: PrimusAPI;
    electron: {
      invoke(channel: string, ...args: any[]): Promise<any>;
      send(channel: string, data: any): void;
      receive(channel: string, func: (...args: any[]) => void): void;
    };
  }
}

export {};
