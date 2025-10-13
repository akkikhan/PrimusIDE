import React, { useState, useEffect, useCallback } from 'react';

interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileItem[];
  isExpanded?: boolean;
}

interface FileExplorerProps {
  onFileSelect: (filePath: string) => void;
  rootPath?: string;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ 
  onFileSelect, 
  rootPath = process.cwd() 
}) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [creatingItem, setCreatingItem] = useState<'file' | 'folder' | null>(null);
  const [selectedPath, setSelectedPath] = useState<string>('');

  const loadDirectory = useCallback(async (path: string): Promise<FileItem[]> => {
    try {
      // Use primus API to read directory
      const result = await window.primus.fs.readDir(path);
      return result?.map(entry => ({
        name: entry.name,
        path: entry.path,
        type: entry.isDirectory ? 'directory' : 'file'
      })) || [];
    } catch (err) {
      console.error('Error loading directory:', err);
      return [];
    }
  }, []);

  const createNewFile = useCallback(async (fileName: string, directoryPath: string) => {
    try {
      const filePath = `${directoryPath}/${fileName}`;
      await window.primus.fs.writeFile(filePath, '');
      // Refresh the directory
      const updatedFiles = await loadDirectory(directoryPath);
      setFiles(updatedFiles);
      setCreatingItem(null);
      setNewItemName('');
    } catch (error) {
      console.error('Error creating file:', error);
      setError('Failed to create file');
    }
  }, [loadDirectory]);

  const createNewFolder = useCallback(async (folderName: string, directoryPath: string) => {
    try {
      // For now, we'll use terminal command to create directory
      await window.primus.terminal.executeCommand(`mkdir "${directoryPath}/${folderName}"`);
      // Refresh the directory
      const updatedFiles = await loadDirectory(directoryPath);
      setFiles(updatedFiles);
      setCreatingItem(null);
      setNewItemName('');
    } catch (error) {
      console.error('Error creating folder:', error);
      setError('Failed to create folder');
    }
  }, [loadDirectory]);

  const handleCreateItem = useCallback(() => {
    if (!newItemName.trim() || !selectedPath) return;

    const parentPath = selectedPath || rootPath;
    if (creatingItem === 'file') {
      createNewFile(newItemName.trim(), parentPath);
    } else if (creatingItem === 'folder') {
      createNewFolder(newItemName.trim(), parentPath);
    }
  }, [newItemName, selectedPath, creatingItem, createNewFile, createNewFolder, rootPath]);

  const handleCancelCreate = useCallback(() => {
    setCreatingItem(null);
    setNewItemName('');
    setSelectedPath('');
  }, []);

  const refreshDirectory = useCallback(async () => {
    setLoading(true);
    try {
      const updatedFiles = await loadDirectory(rootPath);
      setFiles(updatedFiles);
      setError(null);
    } catch (err) {
      setError('Failed to refresh directory');
      console.error('Error refreshing directory:', err);
    } finally {
      setLoading(false);
    }
  }, [rootPath, loadDirectory]);

  const toggleDirectory = useCallback(async (item: FileItem) => {
    if (item.type !== 'directory') return;

    const updateFiles = (items: FileItem[]): FileItem[] => {
      return items.map(file => {
        if (file.path === item.path) {
          if (!file.isExpanded && !file.children) {
            // Load children asynchronously
            loadDirectory(file.path).then(children => {
              setFiles(prevFiles => updateFiles(prevFiles));
            });
            return { ...file, isExpanded: true, children: [] };
          }
          return { ...file, isExpanded: !file.isExpanded };
        }
        if (file.children) {
          return { ...file, children: updateFiles(file.children) };
        }
        return file;
      });
    };

    setFiles(updateFiles);
  }, [loadDirectory]);

  const handleFileClick = useCallback((item: FileItem) => {
    if (item.type === 'file') {
      onFileSelect(item.path);
    } else {
      toggleDirectory(item);
    }
  }, [onFileSelect, toggleDirectory]);

  useEffect(() => {
    const initializeFileTree = async () => {
      setLoading(true);
      try {
        const rootFiles = await loadDirectory(rootPath);
        setFiles(rootFiles);
        setError(null);
      } catch (err) {
        setError('Failed to load files');
        console.error('Error initializing file tree:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeFileTree();
  }, [rootPath, loadDirectory]);

  const renderFileItem = (item: FileItem, depth = 0) => {
    const paddingLeft = depth * 16 + 8;
    const isDirectory = item.type === 'directory';
    const isExpanded = item.isExpanded;

    return (
      <div key={item.path}>
        <div
          className={`file-item ${isDirectory ? 'directory' : 'file'} depth-${depth}`}
          onClick={() => handleFileClick(item)}
        >
          {isDirectory && (
            <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
              {isExpanded ? '▼' : '▶'}
            </span>
          )}
          <span className="file-icon">
            {isDirectory ? '📁' : getFileIcon(item.name)}
          </span>
          <span className="file-name">{item.name}</span>
        </div>
        {isDirectory && isExpanded && item.children && (
          <div className="directory-children">
            {item.children.map(child => renderFileItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const getFileIcon = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const iconMap: Record<string, string> = {
      'js': '📄',
      'jsx': '⚛️',
      'ts': '📘',
      'tsx': '⚛️',
      'html': '🌐',
      'css': '🎨',
      'scss': '🎨',
      'sass': '🎨',
      'json': '📋',
      'md': '📝',
      'txt': '📄',
      'py': '🐍',
      'java': '☕',
      'cpp': '⚙️',
      'c': '⚙️',
      'php': '🐘',
      'rb': '💎',
      'go': '🐹',
      'rs': '🦀',
      'svg': '🖼️',
      'png': '🖼️',
      'jpg': '🖼️',
      'jpeg': '🖼️',
      'gif': '🖼️',
      'pdf': '📕',
      'zip': '📦',
      'rar': '📦',
    };
    return iconMap[ext || ''] || '📄';
  };

  if (loading) {
    return (
      <div className="file-explorer loading">
        <div className="loading-spinner">Loading files...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="file-explorer error">
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
          <button 
            className="retry-button"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="file-explorer">
      <div className="explorer-header">
        <h3>Explorer</h3>
        <div className="explorer-actions">
          <button 
            className="action-button" 
            title="New File"
            onClick={() => {
              setCreatingItem('file');
              setSelectedPath(rootPath);
            }}
          >
            📄
          </button>
          <button 
            className="action-button" 
            title="New Folder"
            onClick={() => {
              setCreatingItem('folder');
              setSelectedPath(rootPath);
            }}
          >
            📁
          </button>
          <button 
            className="action-button" 
            title="Refresh"
            onClick={refreshDirectory}
          >
            🔄
          </button>
        </div>
      </div>
      <div className="file-tree">
        {creatingItem && (
          <div className="new-item-input">
            <span className="file-icon">{creatingItem === 'file' ? '📄' : '📁'}</span>
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateItem();
                } else if (e.key === 'Escape') {
                  handleCancelCreate();
                }
              }}
              placeholder={`New ${creatingItem} name`}
              autoFocus
            />
            <button onClick={handleCreateItem} className="confirm-button">✓</button>
            <button onClick={handleCancelCreate} className="cancel-button">✗</button>
          </div>
        )}
        {files.length === 0 && !creatingItem ? (
          <div className="empty-directory">
            <span className="empty-icon">📂</span>
            <p>No files in this directory</p>
          </div>
        ) : (
          files.map(item => renderFileItem(item))
        )}
      </div>
    </div>
  );
};

export default FileExplorer;
