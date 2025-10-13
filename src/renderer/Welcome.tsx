import React, { useState, useEffect } from 'react';
import { RecentProjectsManager } from './managers/RecentProjectsManager';
import { IRecentProject } from '@shared/types';
import './styles/Welcome.css';

interface WelcomeProps {
  onNewFile: () => void;
  onOpenFile: () => void;
  onOpenFolder: () => void;
  onOpenPath: (path: string) => void;
}

const Welcome: React.FC<WelcomeProps> = ({ onNewFile, onOpenFile, onOpenFolder, onOpenPath }) => {
  const [recentProjects, setRecentProjects] = useState<IRecentProject[]>([]);

  useEffect(() => {
    setRecentProjects(RecentProjectsManager.getRecentProjects());
  }, []);

  const handleRemoveProject = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    setRecentProjects(RecentProjectsManager.removeProject(path));
  };

  return (
    <div className="welcome-container">
      <div className="welcome-content">
        <div className="welcome-header">
          <h1 className="welcome-title">Primus IDE</h1>
          <p className="welcome-subtitle">Your Native AI Code Editor</p>
        </div>
        <div className="welcome-actions">
          <div className="welcome-action-group">
            <h2 className="welcome-group-title">Start</h2>
            <button className="welcome-button" onClick={onNewFile}>
              <span className="button-icon">📄</span>
              <span className="button-text">New File</span>
            </button>
            <button className="welcome-button" onClick={onOpenFile}>
              <span className="button-icon">📂</span>
              <span className="button-text">Open File</span>
            </button>
            <button className="welcome-button" onClick={onOpenFolder}>
              <span className="button-icon">🗂️</span>
              <span className="button-text">Open Folder</span>
            </button>
          </div>
          <div className="welcome-action-group">
            <h2 className="welcome-group-title">Recent</h2>
            {recentProjects.length > 0 ? (
              <ul className="recent-projects-list">
                {recentProjects.map((project) => (
                  <li key={project.path} className="recent-project-item" onClick={() => onOpenPath(project.path)}>
                    <div className="project-info">
                      <span className="project-name">{project.name}</span>
                      <span className="project-path">{project.path}</span>
                    </div>
                    <button className="remove-project-button" onClick={(e) => handleRemoveProject(e, project.path)}>
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="coming-soon">(No recent projects)</p>
            )}
          </div>
        </div>
        <div className="welcome-footer">
          <p>Version 1.0.0</p>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
