// Plugin Dashboard Component - Comprehensive plugin management interface
// Marketplace integration, plugin discovery, installation, configuration, and monitoring

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import PluginArchitectureSystem, { 
  PluginInstance, 
  PluginManifest, 
  PluginState, 
  PluginSystemStatistics,
  PluginCategory,
  MarketplaceInfo
} from '../services/PluginArchitectureSystem';

interface PluginDashboardProps {
  pluginSystem: PluginArchitectureSystem;
  isVisible: boolean;
  onToggle: () => void;
}

interface PluginStats {
  totalPlugins: number;
  activePlugins: number;
  installedPlugins: number;
  availableUpdates: number;
  memoryUsage: number;
  errorCount: number;
}

interface MarketplacePlugin {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  rating: number;
  downloads: number;
  category: PluginCategory;
  tags: string[];
  screenshots: string[];
  pricing: 'free' | 'premium' | 'subscription';
  featured: boolean;
  verified: boolean;
  lastUpdated: Date;
  installSize: number;
}

interface FilterOptions {
  category: PluginCategory | 'all';
  status: 'all' | 'installed' | 'available' | 'enabled' | 'disabled' | 'error';
  pricing: 'all' | 'free' | 'premium' | 'subscription';
  search: string;
  sortBy: 'name' | 'rating' | 'downloads' | 'updated' | 'size';
  sortOrder: 'asc' | 'desc';
}

interface PluginOperation {
  type: 'install' | 'uninstall' | 'enable' | 'disable' | 'update' | 'configure';
  pluginId: string;
  progress: number;
  status: 'pending' | 'running' | 'completed' | 'error';
  error?: string;
}

type DashboardView = 'overview' | 'installed' | 'marketplace' | 'categories' | 'updates' | 'settings';

const PluginDashboard: React.FC<PluginDashboardProps> = ({
  pluginSystem,
  isVisible,
  onToggle
}) => {
  // State management
  const [currentView, setCurrentView] = useState<DashboardView>('overview');
  const [installedPlugins, setInstalledPlugins] = useState<PluginInstance[]>([]);
  const [marketplacePlugins, setMarketplacePlugins] = useState<MarketplacePlugin[]>([]);
  const [selectedPlugin, setSelectedPlugin] = useState<string | null>(null);
  const [stats, setStats] = useState<PluginStats>({
    totalPlugins: 0,
    activePlugins: 0,
    installedPlugins: 0,
    availableUpdates: 0,
    memoryUsage: 0,
    errorCount: 0
  });
  const [filters, setFilters] = useState<FilterOptions>({
    category: 'all',
    status: 'all',
    pricing: 'all',
    search: '',
    sortBy: 'name',
    sortOrder: 'asc'
  });
  const [operations, setOperations] = useState<Map<string, PluginOperation>>(new Map());
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  } | null>(null);

  // Refs
  const dashboardRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load data on component mount and visibility change
  useEffect(() => {
    if (isVisible) {
      loadDashboardData();
      setupEventListeners();
    }

    return () => {
      cleanupEventListeners();
    };
  }, [isVisible]);

  // Auto-refresh data periodically
  useEffect(() => {
    if (!isVisible) return;

    const refreshInterval = setInterval(() => {
      refreshStats();
      refreshOperationStatus();
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(refreshInterval);
  }, [isVisible]);

  /**
   * Load all dashboard data
   */
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadInstalledPlugins(),
        loadMarketplacePlugins(),
        loadStats()
      ]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      showNotification('error', 'Failed to load plugin data');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Load installed plugins
   */
  const loadInstalledPlugins = useCallback(async () => {
    try {
      const plugins = pluginSystem.getAllPlugins();
      setInstalledPlugins(plugins);
    } catch (error) {
      console.error('Failed to load installed plugins:', error);
      throw error;
    }
  }, [pluginSystem]);

  /**
   * Load marketplace plugins
   */
  const loadMarketplacePlugins = useCallback(async () => {
    try {
      // Mock marketplace data - in real implementation, this would fetch from the marketplace
      const mockPlugins: MarketplacePlugin[] = [
        {
          id: 'prettier-plugin',
          name: 'Prettier Code Formatter',
          description: 'Code formatter using prettier',
          version: '2.8.0',
          author: 'Prettier',
          rating: 4.8,
          downloads: 15000000,
          category: 'formatters',
          tags: ['formatter', 'javascript', 'typescript', 'css'],
          screenshots: [],
          pricing: 'free',
          featured: true,
          verified: true,
          lastUpdated: new Date(),
          installSize: 2048000
        },
        {
          id: 'eslint-plugin',
          name: 'ESLint',
          description: 'JavaScript and TypeScript linter',
          version: '8.47.0',
          author: 'ESLint Team',
          rating: 4.7,
          downloads: 12000000,
          category: 'linters',
          tags: ['linter', 'javascript', 'typescript', 'code-quality'],
          screenshots: [],
          pricing: 'free',
          featured: true,
          verified: true,
          lastUpdated: new Date(),
          installSize: 1536000
        },
        {
          id: 'github-copilot',
          name: 'GitHub Copilot',
          description: 'AI pair programmer',
          version: '1.100.0',
          author: 'GitHub',
          rating: 4.5,
          downloads: 5000000,
          category: 'ai',
          tags: ['ai', 'autocomplete', 'assistance'],
          screenshots: [],
          pricing: 'premium',
          featured: true,
          verified: true,
          lastUpdated: new Date(),
          installSize: 10240000
        }
      ];

      setMarketplacePlugins(mockPlugins);
    } catch (error) {
      console.error('Failed to load marketplace plugins:', error);
      throw error;
    }
  }, []);

  /**
   * Load system statistics
   */
  const loadStats = useCallback(async () => {
    try {
      const systemStats = pluginSystem.getStatistics();
      const availableUpdates = await checkForUpdates();
      
      setStats({
        totalPlugins: systemStats.totalPlugins,
        activePlugins: systemStats.activePlugins,
        installedPlugins: systemStats.totalPlugins,
        availableUpdates,
        memoryUsage: systemStats.totalMemoryUsage,
        errorCount: systemStats.totalErrors
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
      throw error;
    }
  }, [pluginSystem]);

  /**
   * Check for available updates
   */
  const checkForUpdates = useCallback(async (): Promise<number> => {
    // Mock implementation - would check for actual updates
    return Math.floor(Math.random() * 5);
  }, []);

  /**
   * Refresh statistics
   */
  const refreshStats = useCallback(async () => {
    try {
      await loadStats();
    } catch (error) {
      console.error('Failed to refresh stats:', error);
    }
  }, [loadStats]);

  /**
   * Refresh operation status
   */
  const refreshOperationStatus = useCallback(() => {
    setOperations(prev => {
      const updated = new Map(prev);
      let hasChanges = false;

      for (const [id, operation] of updated) {
        if (operation.status === 'running') {
          // Simulate progress
          const newProgress = Math.min(100, operation.progress + Math.random() * 20);
          updated.set(id, { ...operation, progress: newProgress });
          
          if (newProgress >= 100) {
            updated.set(id, { ...operation, progress: 100, status: 'completed' });
          }
          hasChanges = true;
        }
      }

      return hasChanges ? updated : prev;
    });
  }, []);

  /**
   * Setup event listeners
   */
  const setupEventListeners = useCallback(() => {
    pluginSystem.on('plugin-installed', handlePluginInstalled);
    pluginSystem.on('plugin-uninstalled', handlePluginUninstalled);
    pluginSystem.on('plugin-enabled', handlePluginEnabled);
    pluginSystem.on('plugin-disabled', handlePluginDisabled);
    pluginSystem.on('plugin-error', handlePluginError);
  }, [pluginSystem]);

  /**
   * Cleanup event listeners
   */
  const cleanupEventListeners = useCallback(() => {
    pluginSystem.removeAllListeners();
  }, [pluginSystem]);

  /**
   * Handle plugin installation
   */
  const handlePluginInstalled = useCallback((manifest: PluginManifest) => {
    showNotification('success', `Plugin "${manifest.name}" installed successfully`);
    loadInstalledPlugins();
    loadStats();
  }, [loadInstalledPlugins, loadStats]);

  /**
   * Handle plugin uninstallation
   */
  const handlePluginUninstalled = useCallback((pluginId: string) => {
    showNotification('success', `Plugin uninstalled successfully`);
    loadInstalledPlugins();
    loadStats();
  }, [loadInstalledPlugins, loadStats]);

  /**
   * Handle plugin enabled
   */
  const handlePluginEnabled = useCallback((pluginId: string) => {
    showNotification('success', `Plugin enabled successfully`);
    loadInstalledPlugins();
    loadStats();
  }, [loadInstalledPlugins, loadStats]);

  /**
   * Handle plugin disabled
   */
  const handlePluginDisabled = useCallback((pluginId: string) => {
    showNotification('success', `Plugin disabled successfully`);
    loadInstalledPlugins();
    loadStats();
  }, [loadInstalledPlugins, loadStats]);

  /**
   * Handle plugin error
   */
  const handlePluginError = useCallback((plugin: PluginInstance, error: any) => {
    showNotification('error', `Plugin "${plugin.manifest.name}" encountered an error`);
    loadStats();
  }, [loadStats]);

  /**
   * Show notification
   */
  const showNotification = useCallback((type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  /**
   * Install plugin
   */
  const installPlugin = useCallback(async (pluginId: string) => {
    const operation: PluginOperation = {
      type: 'install',
      pluginId,
      progress: 0,
      status: 'running'
    };

    setOperations(prev => new Map(prev).set(pluginId, operation));

    try {
      await pluginSystem.installPlugin(pluginId);
      setOperations(prev => {
        const updated = new Map(prev);
        updated.set(pluginId, { ...operation, progress: 100, status: 'completed' });
        return updated;
      });
    } catch (error) {
      console.error('Failed to install plugin:', error);
      setOperations(prev => {
        const updated = new Map(prev);
        updated.set(pluginId, { 
          ...operation, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Installation failed' 
        });
        return updated;
      });
      showNotification('error', `Failed to install plugin: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [pluginSystem, showNotification]);

  /**
   * Uninstall plugin
   */
  const uninstallPlugin = useCallback(async (pluginId: string) => {
    const operation: PluginOperation = {
      type: 'uninstall',
      pluginId,
      progress: 0,
      status: 'running'
    };

    setOperations(prev => new Map(prev).set(pluginId, operation));

    try {
      await pluginSystem.uninstallPlugin(pluginId);
      setOperations(prev => {
        const updated = new Map(prev);
        updated.set(pluginId, { ...operation, progress: 100, status: 'completed' });
        return updated;
      });
    } catch (error) {
      console.error('Failed to uninstall plugin:', error);
      setOperations(prev => {
        const updated = new Map(prev);
        updated.set(pluginId, { 
          ...operation, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Uninstallation failed' 
        });
        return updated;
      });
      showNotification('error', `Failed to uninstall plugin: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [pluginSystem, showNotification]);

  /**
   * Enable plugin
   */
  const enablePlugin = useCallback(async (pluginId: string) => {
    try {
      await pluginSystem.enablePlugin(pluginId);
    } catch (error) {
      console.error('Failed to enable plugin:', error);
      showNotification('error', `Failed to enable plugin: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [pluginSystem, showNotification]);

  /**
   * Disable plugin
   */
  const disablePlugin = useCallback(async (pluginId: string) => {
    try {
      await pluginSystem.disablePlugin(pluginId);
    } catch (error) {
      console.error('Failed to disable plugin:', error);
      showNotification('error', `Failed to disable plugin: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [pluginSystem, showNotification]);

  /**
   * Filter plugins based on current filters
   */
  const filteredInstalledPlugins = useMemo(() => {
    let filtered = [...installedPlugins];

    // Filter by search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(plugin => 
        plugin.manifest.name.toLowerCase().includes(searchLower) ||
        plugin.manifest.description.toLowerCase().includes(searchLower) ||
        plugin.manifest.keywords.some(keyword => keyword.toLowerCase().includes(searchLower))
      );
    }

    // Filter by category
    if (filters.category !== 'all') {
      filtered = filtered.filter(plugin => 
        plugin.manifest.categories.includes(filters.category as PluginCategory)
      );
    }

    // Filter by status
    if (filters.status !== 'all') {
      switch (filters.status) {
        case 'enabled':
          filtered = filtered.filter(plugin => plugin.state === 'active');
          break;
        case 'disabled':
          filtered = filtered.filter(plugin => plugin.state === 'inactive');
          break;
        case 'error':
          filtered = filtered.filter(plugin => plugin.state === 'error');
          break;
      }
    }

    // Sort plugins
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (filters.sortBy) {
        case 'name':
          aValue = a.manifest.name.toLowerCase();
          bValue = b.manifest.name.toLowerCase();
          break;
        case 'rating':
          aValue = a.manifest.marketplace.rating;
          bValue = b.manifest.marketplace.rating;
          break;
        case 'downloads':
          aValue = a.manifest.marketplace.downloads;
          bValue = b.manifest.marketplace.downloads;
          break;
        case 'updated':
          aValue = a.manifest.marketplace.lastUpdated.getTime();
          bValue = b.manifest.marketplace.lastUpdated.getTime();
          break;
        case 'size':
          aValue = a.manifest.metadata.installSize;
          bValue = b.manifest.metadata.installSize;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [installedPlugins, filters]);

  /**
   * Filter marketplace plugins
   */
  const filteredMarketplacePlugins = useMemo(() => {
    let filtered = [...marketplacePlugins];

    // Filter by search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(plugin => 
        plugin.name.toLowerCase().includes(searchLower) ||
        plugin.description.toLowerCase().includes(searchLower) ||
        plugin.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Filter by category
    if (filters.category !== 'all') {
      filtered = filtered.filter(plugin => plugin.category === filters.category);
    }

    // Filter by pricing
    if (filters.pricing !== 'all') {
      filtered = filtered.filter(plugin => plugin.pricing === filters.pricing);
    }

    // Sort plugins
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (filters.sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'rating':
          aValue = a.rating;
          bValue = b.rating;
          break;
        case 'downloads':
          aValue = a.downloads;
          bValue = b.downloads;
          break;
        case 'updated':
          aValue = a.lastUpdated.getTime();
          bValue = b.lastUpdated.getTime();
          break;
        case 'size':
          aValue = a.installSize;
          bValue = b.installSize;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [marketplacePlugins, filters]);

  /**
   * Format file size
   */
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  /**
   * Format number with commas
   */
  const formatNumber = useCallback((num: number): string => {
    return num.toLocaleString();
  }, []);

  /**
   * Get status color
   */
  const getStatusColor = useCallback((state: PluginState): string => {
    switch (state) {
      case 'active': return 'var(--vscode-testing-iconPassed)';
      case 'inactive': return 'var(--vscode-testing-iconSkipped)';
      case 'error': return 'var(--vscode-testing-iconFailed)';
      case 'activating': return 'var(--vscode-progressBar-background)';
      case 'deactivating': return 'var(--vscode-progressBar-background)';
      default: return 'var(--vscode-foreground)';
    }
  }, []);

  /**
   * Render overview panel
   */
  const renderOverview = () => (
    <div className="overview-panel">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalPlugins}</div>
            <div className="stat-label">Total Plugins</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{stats.activePlugins}</div>
            <div className="stat-label">Active Plugins</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">⬆️</div>
          <div className="stat-content">
            <div className="stat-value">{stats.availableUpdates}</div>
            <div className="stat-label">Available Updates</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">💾</div>
          <div className="stat-content">
            <div className="stat-value">{formatFileSize(stats.memoryUsage)}</div>
            <div className="stat-label">Memory Usage</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">❌</div>
          <div className="stat-content">
            <div className="stat-value">{stats.errorCount}</div>
            <div className="stat-label">Errors</div>
          </div>
        </div>
      </div>

      <div className="recent-activities">
        <h3>Recent Activities</h3>
        <div className="activity-list">
          {Array.from(operations.values()).slice(-5).map((operation, index) => (
            <div key={index} className="activity-item">
              <div className="activity-icon">
                {operation.type === 'install' ? '📥' : 
                 operation.type === 'uninstall' ? '🗑️' : 
                 operation.type === 'enable' ? '▶️' : 
                 operation.type === 'disable' ? '⏸️' : '⚙️'}
              </div>
              <div className="activity-content">
                <div className="activity-title">
                  {operation.type.charAt(0).toUpperCase() + operation.type.slice(1)} Plugin
                </div>
                <div className="activity-description">
                  Plugin ID: {operation.pluginId}
                </div>
              </div>
              <div className={`activity-status ${operation.status}`}>
                {operation.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  /**
   * Render installed plugins
   */
  const renderInstalledPlugins = () => (
    <div className="plugins-panel">
      <div className="plugins-header">
        <h3>Installed Plugins ({filteredInstalledPlugins.length})</h3>
        <div className="plugins-actions">
          <button 
            className="refresh-button"
            onClick={loadInstalledPlugins}
            title="Refresh plugins"
          >
            🔄
          </button>
        </div>
      </div>

      <div className="plugins-grid">
        {filteredInstalledPlugins.map(plugin => (
          <div 
            key={plugin.id}
            className={`plugin-card ${selectedPlugin === plugin.id ? 'selected' : ''}`}
            onClick={() => setSelectedPlugin(selectedPlugin === plugin.id ? null : plugin.id)}
          >
            <div className="plugin-header">
              <div className="plugin-icon">
                {plugin.manifest.icon ? (
                  <img src={plugin.manifest.icon} alt={plugin.manifest.name} />
                ) : (
                  <div className="default-icon">🔌</div>
                )}
              </div>
              <div className="plugin-info">
                <div className="plugin-name">{plugin.manifest.displayName}</div>
                <div className="plugin-version">v{plugin.manifest.version}</div>
              </div>
              <div className="plugin-status">
                <div 
                  className="status-indicator"
                  style={{ backgroundColor: getStatusColor(plugin.state) }}
                  title={plugin.state}
                />
              </div>
            </div>

            <div className="plugin-description">
              {plugin.manifest.description}
            </div>

            <div className="plugin-meta">
              <div className="plugin-author">by {plugin.manifest.author.name}</div>
              <div className="plugin-size">{formatFileSize(plugin.manifest.metadata.installSize)}</div>
            </div>

            <div className="plugin-actions">
              {plugin.state === 'active' ? (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    disablePlugin(plugin.id);
                  }}
                  className="disable-button"
                >
                  Disable
                </button>
              ) : (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    enablePlugin(plugin.id);
                  }}
                  className="enable-button"
                >
                  Enable
                </button>
              )}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  uninstallPlugin(plugin.id);
                }}
                className="uninstall-button"
              >
                Uninstall
              </button>
            </div>

            {operations.has(plugin.id) && (
              <div className="operation-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${operations.get(plugin.id)!.progress}%` }}
                  />
                </div>
                <div className="progress-text">
                  {operations.get(plugin.id)!.type} {operations.get(plugin.id)!.progress}%
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  /**
   * Render marketplace
   */
  const renderMarketplace = () => (
    <div className="marketplace-panel">
      <div className="marketplace-header">
        <h3>Plugin Marketplace ({filteredMarketplacePlugins.length})</h3>
      </div>

      <div className="marketplace-grid">
        {filteredMarketplacePlugins.map(plugin => {
          const isInstalled = installedPlugins.some(p => p.id === plugin.id);
          const operation = operations.get(plugin.id);

          return (
            <div 
              key={plugin.id}
              className={`marketplace-card ${selectedPlugin === plugin.id ? 'selected' : ''}`}
              onClick={() => setSelectedPlugin(selectedPlugin === plugin.id ? null : plugin.id)}
            >
              <div className="marketplace-header">
                <div className="marketplace-badges">
                  {plugin.featured && <span className="badge featured">Featured</span>}
                  {plugin.verified && <span className="badge verified">Verified</span>}
                  {plugin.pricing !== 'free' && <span className="badge premium">{plugin.pricing}</span>}
                </div>
                <div className="marketplace-rating">
                  <span className="rating-stars">{'⭐'.repeat(Math.floor(plugin.rating))}</span>
                  <span className="rating-value">{plugin.rating}</span>
                </div>
              </div>

              <div className="marketplace-info">
                <div className="marketplace-name">{plugin.name}</div>
                <div className="marketplace-author">by {plugin.author}</div>
                <div className="marketplace-description">{plugin.description}</div>
              </div>

              <div className="marketplace-stats">
                <div className="stat">
                  <span className="stat-icon">⬇️</span>
                  <span className="stat-value">{formatNumber(plugin.downloads)}</span>
                </div>
                <div className="stat">
                  <span className="stat-icon">📏</span>
                  <span className="stat-value">{formatFileSize(plugin.installSize)}</span>
                </div>
                <div className="stat">
                  <span className="stat-icon">📅</span>
                  <span className="stat-value">{plugin.lastUpdated.toLocaleDateString()}</span>
                </div>
              </div>

              <div className="marketplace-tags">
                {plugin.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>

              <div className="marketplace-actions">
                {isInstalled ? (
                  <button className="installed-button" disabled>
                    ✅ Installed
                  </button>
                ) : (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      installPlugin(plugin.id);
                    }}
                    className="install-button"
                    disabled={!!operation}
                  >
                    {operation ? 'Installing...' : 'Install'}
                  </button>
                )}
              </div>

              {operation && (
                <div className="operation-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${operation.progress}%` }}
                    />
                  </div>
                  <div className="progress-text">
                    {operation.type} {operation.progress}%
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  /**
   * Render filters
   */
  const renderFilters = () => (
    <div className="filters-section">
      <div className="search-box">
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search plugins..."
          value={filters.search}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          className="search-input"
        />
      </div>

      <div className="filter-controls">
        <select
          value={filters.category}
          onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value as any }))}
          className="filter-select"
        >
          <option value="all">All Categories</option>
          <option value="editor">Editor</option>
          <option value="debugger">Debugger</option>
          <option value="testing">Testing</option>
          <option value="themes">Themes</option>
          <option value="languages">Languages</option>
          <option value="snippets">Snippets</option>
          <option value="formatters">Formatters</option>
          <option value="linters">Linters</option>
          <option value="git">Git</option>
          <option value="productivity">Productivity</option>
          <option value="ai">AI</option>
          <option value="collaboration">Collaboration</option>
          <option value="deployment">Deployment</option>
          <option value="database">Database</option>
          <option value="cloud">Cloud</option>
          <option value="other">Other</option>
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
          className="filter-select"
        >
          <option value="all">All Status</option>
          <option value="installed">Installed</option>
          <option value="available">Available</option>
          <option value="enabled">Enabled</option>
          <option value="disabled">Disabled</option>
          <option value="error">Error</option>
        </select>

        {currentView === 'marketplace' && (
          <select
            value={filters.pricing}
            onChange={(e) => setFilters(prev => ({ ...prev, pricing: e.target.value as any }))}
            className="filter-select"
          >
            <option value="all">All Pricing</option>
            <option value="free">Free</option>
            <option value="premium">Premium</option>
            <option value="subscription">Subscription</option>
          </select>
        )}

        <select
          value={filters.sortBy}
          onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
          className="filter-select"
        >
          <option value="name">Name</option>
          <option value="rating">Rating</option>
          <option value="downloads">Downloads</option>
          <option value="updated">Updated</option>
          <option value="size">Size</option>
        </select>

        <button
          onClick={() => setFilters(prev => ({ 
            ...prev, 
            sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' 
          }))}
          className="sort-order-button"
          title={`Sort ${filters.sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
        >
          {filters.sortOrder === 'asc' ? '⬆️' : '⬇️'}
        </button>
      </div>
    </div>
  );

  /**
   * Render navigation
   */
  const renderNavigation = () => (
    <div className="navigation-bar">
      <div className="nav-items">
        <button
          className={`nav-item ${currentView === 'overview' ? 'active' : ''}`}
          onClick={() => setCurrentView('overview')}
        >
          <span className="nav-icon">📊</span>
          <span className="nav-label">Overview</span>
        </button>
        
        <button
          className={`nav-item ${currentView === 'installed' ? 'active' : ''}`}
          onClick={() => setCurrentView('installed')}
        >
          <span className="nav-icon">📦</span>
          <span className="nav-label">Installed</span>
          <span className="nav-badge">{installedPlugins.length}</span>
        </button>
        
        <button
          className={`nav-item ${currentView === 'marketplace' ? 'active' : ''}`}
          onClick={() => setCurrentView('marketplace')}
        >
          <span className="nav-icon">🏪</span>
          <span className="nav-label">Marketplace</span>
        </button>
        
        {stats.availableUpdates > 0 && (
          <button
            className={`nav-item ${currentView === 'updates' ? 'active' : ''}`}
            onClick={() => setCurrentView('updates')}
          >
            <span className="nav-icon">⬆️</span>
            <span className="nav-label">Updates</span>
            <span className="nav-badge updates">{stats.availableUpdates}</span>
          </button>
        )}
        
        <button
          className={`nav-item ${currentView === 'settings' ? 'active' : ''}`}
          onClick={() => setCurrentView('settings')}
        >
          <span className="nav-icon">⚙️</span>
          <span className="nav-label">Settings</span>
        </button>
      </div>
    </div>
  );

  /**
   * Render current view content
   */
  const renderContent = () => {
    switch (currentView) {
      case 'overview':
        return renderOverview();
      case 'installed':
        return renderInstalledPlugins();
      case 'marketplace':
        return renderMarketplace();
      case 'categories':
        return <div className="categories-panel">Categories view - Coming soon</div>;
      case 'updates':
        return <div className="updates-panel">Updates view - Coming soon</div>;
      case 'settings':
        return <div className="settings-panel">Settings view - Coming soon</div>;
      default:
        return renderOverview();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="plugin-dashboard" ref={dashboardRef}>
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h2>Plugin Dashboard</h2>
          <button 
            className="close-button"
            onClick={onToggle}
            title="Close Dashboard"
          >
            ✕
          </button>
        </div>
        {loading && (
          <div className="loading-indicator">
            <div className="loading-spinner" />
            <span>Loading...</span>
          </div>
        )}
      </div>

      {renderNavigation()}
      
      {(currentView === 'installed' || currentView === 'marketplace') && renderFilters()}

      <div className="dashboard-content">
        {renderContent()}
      </div>

      {notification && (
        <div className={`notification ${notification.type}`}>
          <div className="notification-content">
            <span className="notification-icon">
              {notification.type === 'success' ? '✅' :
               notification.type === 'error' ? '❌' :
               notification.type === 'warning' ? '⚠️' : 'ℹ️'}
            </span>
            <span className="notification-message">{notification.message}</span>
          </div>
          <button 
            className="notification-close"
            onClick={() => setNotification(null)}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default PluginDashboard;
