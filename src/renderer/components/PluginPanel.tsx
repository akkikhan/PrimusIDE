import React, { useState, useEffect } from 'react';
import { Plugin, pluginManager } from '../services/PluginManager';
import './PluginPanel.css';

export const PluginPanel: React.FC = () => {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadPlugins();
  }, []);

  const loadPlugins = async () => {
    try {
      setLoading(true);
      await pluginManager.loadPlugins();
      setPlugins(pluginManager.getPlugins());
    } catch (error) {
      console.error('Error loading plugins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActivatePlugin = async (pluginId: string) => {
    try {
      await pluginManager.activatePlugin(pluginId);
      // Refresh the plugin list
      setPlugins(pluginManager.getPlugins());
    } catch (error) {
      console.error('Error activating plugin:', error);
    }
  };

  const handleDeactivatePlugin = async (pluginId: string) => {
    try {
      await pluginManager.deactivatePlugin(pluginId);
      // Refresh the plugin list
      setPlugins(pluginManager.getPlugins());
    } catch (error) {
      console.error('Error deactivating plugin:', error);
    }
  };

  const filteredPlugins = plugins.filter(plugin => 
    plugin.manifest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    plugin.manifest.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPluginStatus = (plugin: Plugin) => {
    if (plugin.isActive) {
      return 'active';
    }
    return 'inactive';
  };

  return (
    <div className="plugin-panel">
      <div className="plugin-panel-header">
        <h2>Plugins</h2>
        <div className="plugin-panel-actions">
          <button className="refresh-button" onClick={loadPlugins}>
            🔄 Refresh
          </button>
        </div>
      </div>
      
      <div className="plugin-search-container">
        <input
          type="text"
          placeholder="Search plugins..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="plugin-search-input"
        />
      </div>
      
      {loading ? (
        <div className="plugin-loading">
          <div className="spinner"></div>
          <p>Loading plugins...</p>
        </div>
      ) : (
        <div className="plugin-list">
          {filteredPlugins.length > 0 ? (
            filteredPlugins.map(plugin => (
              <div key={plugin.id} className="plugin-item">
                <div className="plugin-info">
                  <div className="plugin-name">
                    {plugin.manifest.name}
                    <span className="plugin-version">v{plugin.manifest.version}</span>
                  </div>
                  <div className="plugin-description">
                    {plugin.manifest.description}
                  </div>
                  <div className="plugin-author">
                    by {plugin.manifest.author}
                  </div>
                </div>
                
                <div className="plugin-actions">
                  <span className={`plugin-status ${getPluginStatus(plugin)}`}>
                    {plugin.isActive ? 'Active' : 'Inactive'}
                  </span>
                  
                  {plugin.isActive ? (
                    <button 
                      className="deactivate-button"
                      onClick={() => handleDeactivatePlugin(plugin.id)}
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button 
                      className="activate-button"
                      onClick={() => handleActivatePlugin(plugin.id)}
                    >
                      Activate
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="plugin-empty">
              {searchQuery ? 'No plugins match your search.' : 'No plugins found.'}
            </div>
          )}
        </div>
      )}
      
      <div className="plugin-panel-footer">
        <div className="plugin-stats">
          {plugins.length} plugin{plugins.length !== 1 ? 's' : ''} installed
          {' • '}
          {plugins.filter(p => p.isActive).length} active
        </div>
      </div>
    </div>
  );
};

export default PluginPanel;