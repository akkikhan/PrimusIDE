import React, { useState, useEffect } from 'react';
import './PinnedContext.css';

interface PinnedItem {
  id: string;
  type: 'file' | 'snippet' | 'terminal';
  content: string;
  meta?: any;
}

export const PinnedContext: React.FC = () => {
  const [pinnedItems, setPinnedItems] = useState<PinnedItem[]>([]);

  useEffect(() => {
    loadPinnedItems();
    // Optional: Poll or listen for updates
    const interval = setInterval(loadPinnedItems, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadPinnedItems = async () => {
    try {
      if (window.primus?.retrieval?.pin?.list) {
        const items = await window.primus.retrieval.pin.list();
        setPinnedItems(items || []);
      }
    } catch (e) {
      console.warn('Failed to load pinned items', e);
    }
  };

  const handleUnpin = async (id: string) => {
    try {
      if (window.primus?.retrieval?.pin?.remove) {
        await window.primus.retrieval.pin.remove(id);
        loadPinnedItems();
      }
    } catch (e) {
      console.error('Failed to unpin item', e);
    }
  };

  if (pinnedItems.length === 0) return null;

  return (
    <div className="pinned-context-container">
      <div className="pinned-header">
        <span>📌 Pinned Context ({pinnedItems.length})</span>
      </div>
      <div className="pinned-list">
        {pinnedItems.map(item => (
          <div key={item.id} className="pinned-item">
            <span className="pinned-item-icon">
              {item.type === 'file' ? '📄' : item.type === 'terminal' ? '💻' : '📝'}
            </span>
            <span className="pinned-item-content">
              {item.id}
            </span>
            <button
              className="unpin-button"
              onClick={() => handleUnpin(item.id)}
              title="Remove from context"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
