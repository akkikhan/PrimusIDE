
/**
 * Safe Electron Bridge - Provides fallbacks for missing Electron IPC
 */

export interface ElectronBridge {
  send: (channel: string, data?: any) => void;
  receive: (channel: string, callback: (...args: any[]) => void) => void;
  removeAllListeners: (channel: string) => void;
}

class SafeElectronBridge implements ElectronBridge {
  private isElectronAvailable(): boolean {
    return !!(window as any).electron;
  }

  send(channel: string, data?: any): void {
    if (this.isElectronAvailable() && (window as any).electron.send) {
      (window as any).electron.send(channel, data);
    } else {
      console.warn(`[SafeElectronBridge] Cannot send to channel '${channel}' - Electron IPC not available`);
    }
  }

  receive(channel: string, callback: (...args: any[]) => void): void {
    if (this.isElectronAvailable() && (window as any).electron.receive) {
      (window as any).electron.receive(channel, callback);
    } else {
      console.warn(`[SafeElectronBridge] Cannot receive from channel '${channel}' - Electron IPC not available`);
    }
  }

  removeAllListeners(channel: string): void {
    if (this.isElectronAvailable() && (window as any).electron.removeAllListeners) {
      (window as any).electron.removeAllListeners(channel);
    } else {
      console.warn(`[SafeElectronBridge] Cannot remove listeners for channel '${channel}' - Electron IPC not available`);
    }
  }

  isAvailable(): boolean {
    return this.isElectronAvailable();
  }
}

// Export singleton instance
export const safeElectron = new SafeElectronBridge();

// Helper function to check if we're running in Electron
export const isElectronEnvironment = (): boolean => {
  return !!(window as any).electron;
};

// Helper function to wait for Electron to be ready
export const waitForElectron = (timeout: number = 5000): Promise<boolean> => {
  return new Promise((resolve) => {
    if (isElectronEnvironment()) {
      resolve(true);
      return;
    }

    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (isElectronEnvironment()) {
        clearInterval(checkInterval);
        resolve(true);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        resolve(false);
      }
    }, 100);
  });
};