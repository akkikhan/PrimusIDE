import React, { useState, useEffect } from 'react';
import { PluginManifest, PluginData } from './types';

interface PluginSystemProps {
  isVisible: boolean;
  onToggle: () => void;
}

interface InstalledPlugin {
  id: string;
  manifest: PluginManifest;
  enabled: boolean;
  loadedAt: Date;
}

const PluginSystem: React.FC<PluginSystemProps> = ({ isVisible, onToggle }) => {
  const [activeTab, setActiveTab] = useState<'installed' | 'marketplace' | 'develop'>('installed');
  const [installedPlugins, setInstalledPlugins] = useState<InstalledPlugin[]>([]);
  const [marketplacePlugins, setMarketplacePlugins] = useState<PluginData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'downloads' | 'rating' | 'updated'>('name');

  useEffect(() => {
    if (isVisible) {
      loadInstalledPlugins();
      if (activeTab === 'marketplace') {
        loadMarketplacePlugins();
      }
    }
  }, [isVisible, activeTab]);

  const loadInstalledPlugins = async () => {
    try {
      setLoading(true);
      const plugins = await window.electronAPI.plugins.getInstalled();
      setInstalledPlugins(plugins);
    } catch (error) {
      console.error('Failed to load installed plugins:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMarketplacePlugins = async () => {
    try {
      setLoading(true);
      const plugins = await window.electronAPI.plugins.getMarketplace();
      setMarketplacePlugins(plugins);
    } catch (error) {
      console.error('Failed to load marketplace plugins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInstallPlugin = async (pluginId: string) => {
    try {
      setLoading(true);
      await window.electronAPI.plugins.install(pluginId);
      await loadInstalledPlugins();
      // Show success notification
    } catch (error) {
      console.error('Failed to install plugin:', error);
      // Show error notification
    } finally {
      setLoading(false);
    }
  };

  const handleUninstallPlugin = async (pluginId: string) => {
    try {
      setLoading(true);
      await window.electronAPI.plugins.uninstall(pluginId);
      await loadInstalledPlugins();
    } catch (error) {
      console.error('Failed to uninstall plugin:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePlugin = async (pluginId: string, enabled: boolean) => {
    try {
      if (enabled) {
        await window.electronAPI.plugins.enable(pluginId);
      } else {
        await window.electronAPI.plugins.disable(pluginId);
      }
      await loadInstalledPlugins();
    } catch (error) {
      console.error('Failed to toggle plugin:', error);
    }
  };

  const filteredMarketplacePlugins = marketplacePlugins
    .filter(plugin => 
      plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plugin.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plugin.author.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'downloads':
          return b.downloads - a.downloads;
        case 'rating':
          return b.rating - a.rating;
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        default:
          return a.name.localeCompare(b.name);
      }
    });

  const renderInstalledTab = () => (
    <div className="plugin-content">
      <div className="plugin-header">
        <h3>Installed Extensions ({installedPlugins.length})</h3>
        <div className="plugin-actions">
          <button 
            className="plugin-btn-secondary" 
            onClick={loadInstalledPlugins}
            disabled={loading}
            title="Refresh installed plugins"
          >
            🔄 Refresh
          </button>
          <button 
            className="plugin-btn-primary" 
            onClick={() => setActiveTab('marketplace')}
            title="Browse extensions marketplace"
          >
            🛍️ Browse Marketplace
          </button>
        </div>
      </div>

      {loading ? (
        <div className="plugin-loading">
          <div className="loading-spinner"></div>
          <p>Loading plugins...</p>
        </div>
      ) : installedPlugins.length === 0 ? (
        <div className="plugin-empty">
          <div className="empty-icon">📦</div>
          <h4>No Extensions Installed</h4>
          <p>Install extensions from the marketplace to enhance your IDE.</p>
          <button 
            className="plugin-btn-primary" 
            onClick={() => setActiveTab('marketplace')}
          >
            Browse Marketplace
          </button>
        </div>
      ) : (
        <div className="plugin-list">
          {installedPlugins.map(plugin => (
            <div key={plugin.id} className="plugin-card installed">
              <div className="plugin-card-header">
                <div className="plugin-info">
                  <div className="plugin-icon">
                    {plugin.manifest.icon || '🧩'}
                  </div>
                  <div className="plugin-details">
                    <h4 className="plugin-name">{plugin.manifest.name}</h4>
                    <p className="plugin-version">v{plugin.manifest.version}</p>
                    <p className="plugin-author">by {plugin.manifest.author}</p>
                  </div>
                </div>
                <div className="plugin-controls">
                  <label className="plugin-toggle" title={`${plugin.enabled ? 'Disable' : 'Enable'} ${plugin.manifest.name}`}>
                    <input
                      type="checkbox"
                      checked={plugin.enabled}
                      onChange={(e) => handleTogglePlugin(plugin.id, e.target.checked)}
                      aria-label={`${plugin.enabled ? 'Disable' : 'Enable'} ${plugin.manifest.name}`}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  <button
                    className="plugin-btn-danger"
                    onClick={() => handleUninstallPlugin(plugin.id)}
                    title={`Uninstall ${plugin.manifest.name}`}
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <div className="plugin-description">
                {plugin.manifest.description}
              </div>
              <div className="plugin-meta">
                <span className="plugin-status" data-enabled={plugin.enabled}>
                  {plugin.enabled ? '✅ Enabled' : '⏸️ Disabled'}
                </span>
                <span className="plugin-loaded">
                  Loaded: {plugin.loadedAt.toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderMarketplaceTab = () => (
    <div className="plugin-content">
      <div className="plugin-header">
        <h3>Extensions Marketplace</h3>
        <div className="plugin-filters">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search extensions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
              title="Search by name, description, or author"
            />
          </div>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
            className="sort-select"
            title="Sort extensions by"
          >
            <option value="name">Sort by Name</option>
            <option value="downloads">Sort by Downloads</option>
            <option value="rating">Sort by Rating</option>
            <option value="updated">Sort by Last Updated</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="plugin-loading">
          <div className="loading-spinner"></div>
          <p>Loading marketplace...</p>
        </div>
      ) : (
        <div className="plugin-list">
          {filteredMarketplacePlugins.map(plugin => (
            <div key={plugin.id} className="plugin-card marketplace">
              <div className="plugin-card-header">
                <div className="plugin-info">
                  <div className="plugin-icon">
                    {plugin.icon || '🧩'}
                  </div>
                  <div className="plugin-details">
                    <h4 className="plugin-name">{plugin.name}</h4>
                    <p className="plugin-version">v{plugin.version}</p>
                    <p className="plugin-author">by {plugin.author}</p>
                  </div>
                </div>
                <div className="plugin-controls">
                  <button
                    className="plugin-btn-primary"
                    onClick={() => handleInstallPlugin(plugin.id)}
                    disabled={loading || installedPlugins.some(p => p.id === plugin.id)}
                    title={`Install ${plugin.name}`}
                  >
                    {installedPlugins.some(p => p.id === plugin.id) ? '✅ Installed' : '⬇️ Install'}
                  </button>
                </div>
              </div>
              <div className="plugin-description">
                {plugin.description}
              </div>
              <div className="plugin-stats">
                <span className="plugin-downloads">📥 {plugin.downloads.toLocaleString()}</span>
                <span className="plugin-rating">⭐ {plugin.rating.toFixed(1)}</span>
                <span className="plugin-updated">
                  Updated: {new Date(plugin.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderDevelopTab = () => (
    <div className="plugin-content">
      <div className="plugin-header">
        <h3>Plugin Development</h3>
        <div className="plugin-actions">
          <button className="plugin-btn-secondary" title="Reload all plugins">
            🔄 Reload Plugins
          </button>
          <button className="plugin-btn-primary" title="Open plugin development documentation">
            📚 Documentation
          </button>
        </div>
      </div>

      <div className="develop-section">
        <div className="develop-card">
          <h4>📝 Create New Plugin</h4>
          <p>Start building your own extension for Primus IDE.</p>
          <button className="plugin-btn-primary">
            Generate Plugin Template
          </button>
        </div>

        <div className="develop-card">
          <h4>📂 Load Local Plugin</h4>
          <p>Load a plugin from your local development folder.</p>
          <button className="plugin-btn-secondary">
            Load from Folder
          </button>
        </div>

        <div className="develop-card">
          <h4>🔧 Debug Mode</h4>
          <p>Enable debugging features for plugin development.</p>
          <label className="plugin-toggle" title="Enable debug mode for plugin development">
            <input 
              type="checkbox" 
              aria-label="Enable debug mode for plugin development"
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div className="develop-logs">
        <h4>Development Logs</h4>
        <div className="log-container">
          <div className="log-entry">
            <span className="log-time">10:30:42</span>
            <span className="log-level info">INFO</span>
            <span className="log-message">Plugin system initialized</span>
          </div>
          <div className="log-entry">
            <span className="log-time">10:30:45</span>
            <span className="log-level success">LOAD</span>
            <span className="log-message">Loaded plugin: theme-manager</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (!isVisible) {
    return null;
  }

  return (
    <div className="plugin-system">
      <div className="plugin-header-main">
        <div className="plugin-title">
          <h2>🧩 Extensions</h2>
          <p>Manage and discover extensions for Primus IDE</p>
        </div>
        <div className="plugin-actions-main">
          <button className="plugin-btn-secondary" onClick={onToggle} title="Close Extensions Panel">
            ✕ Close
          </button>
        </div>
      </div>

      <div className="plugin-tabs">
        <button
          className={`plugin-tab ${activeTab === 'installed' ? 'active' : ''}`}
          onClick={() => setActiveTab('installed')}
          title="View installed extensions"
        >
          📦 Installed
        </button>
        <button
          className={`plugin-tab ${activeTab === 'marketplace' ? 'active' : ''}`}
          onClick={() => setActiveTab('marketplace')}
          title="Browse extensions marketplace"
        >
          🛍️ Marketplace
        </button>
        <button
          className={`plugin-tab ${activeTab === 'develop' ? 'active' : ''}`}
          onClick={() => setActiveTab('develop')}
          title="Plugin development tools"
        >
          🔧 Develop
        </button>
      </div>

      <div className="plugin-body">
        {activeTab === 'installed' && renderInstalledTab()}
        {activeTab === 'marketplace' && renderMarketplaceTab()}
        {activeTab === 'develop' && renderDevelopTab()}
      </div>
    </div>
  );
};

export default PluginSystem;
