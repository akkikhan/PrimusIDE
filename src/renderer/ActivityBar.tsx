import React, { useState } from 'react';

interface ActivityBarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

interface ActivityItem {
  id: string;
  icon: string;
  title: string;
  badge?: number;
}

const ActivityBar: React.FC<ActivityBarProps> = ({ activeView, onViewChange }) => {
  const activities: ActivityItem[] = [
    { id: 'explorer', icon: '📁', title: 'Explorer' },
    { id: 'search', icon: '🔍', title: 'Search' },
  { id: 'problems', icon: '❗', title: 'Problems' },
    { id: 'outline', icon: '🧭', title: 'Outline' }, // Added outline panel entry
    { id: 'git', icon: '🌿', title: 'Source Control' },
    { id: 'context', icon: '🧠', title: 'Context Awareness' },
    { id: 'code-changes', icon: '🔄', title: 'Code Changes' },
    { id: 'extensions', icon: '🧩', title: 'Extensions' },
    { id: 'settings', icon: '⚙️', title: 'Settings' },
    { id: 'terminal', icon: '💻', title: 'Terminal' }
  ];

  return (
    <div className="activity-bar">
      <div className="activity-items">
        {activities.map(activity => (
          <div
            key={activity.id}
            className={`activity-item ${activeView === activity.id ? 'active' : ''}`}
            onClick={() => onViewChange(activity.id)}
            title={activity.title}
          >
            <span className="activity-icon">{activity.icon}</span>
            {activity.badge && (
              <span className="activity-badge">{activity.badge}</span>
            )}
          </div>
        ))}
      </div>
      
      <div className="activity-bottom">
        <div 
          className="activity-item"
          title="Account"
        >
          <span className="activity-icon">👤</span>
        </div>
        <div 
          className="activity-item"
          title="Manage"
        >
          <span className="activity-icon">⚙️</span>
        </div>
      </div>
    </div>
  );
};

export default ActivityBar;
