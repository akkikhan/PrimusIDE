import chokidar, { FSWatcher } from 'chokidar';
import { BrowserWindow } from 'electron';

class FileWatcher {
  private watcher: FSWatcher | null = null;
  private window: BrowserWindow;

  constructor(window: BrowserWindow) {
    this.window = window;
  }

  public watch(path: string) {
    if (this.watcher) {
      this.watcher.close();
    }

    this.watcher = chokidar.watch(path, {
      ignored: [
        /(^|[\/\\])\../, // ignore dotfiles
        /artifacts[\/\\]ai[\/\\]metrics\.json$/, // ignore metrics file to prevent infinite loops
        /node_modules/,
        /\.git/
      ],
      persistent: true,
      ignoreInitial: true,
    });

    this.watcher
      .on('add', (path: string) => this.window.webContents.send('file-changed', { event: 'add', path }))
      .on('change', (path: string) => this.window.webContents.send('file-changed', { event: 'change', path }))
      .on('unlink', (path: string) => this.window.webContents.send('file-changed', { event: 'unlink', path }));
  }

  public unwatch() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
}

export default FileWatcher;
