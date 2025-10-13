import React, { useState, useEffect } from 'react';

interface Project {
  id: string;
  name: string;
  path: string;
  type: 'react' | 'node' | 'python' | 'web' | 'other';
  lastOpened: Date;
  description?: string;
  gitRepo?: string;
  tasks?: ProjectTask[];
}

interface ProjectTask {
  id: string;
  name: string;
  command: string;
  description: string;
  isRunning?: boolean;
}

interface ProjectManagerProps {
  isVisible: boolean;
  onToggle: () => void;
}

const ProjectManager: React.FC<ProjectManagerProps> = ({ isVisible, onToggle }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showNewProjectForm, setShowNewProjectForm] = useState<boolean>(false);
  const [runningTasks, setRunningTasks] = useState<Set<string>>(new Set());

  const projectTemplates = [
    { 
      name: 'React TypeScript', 
      type: 'react' as const, 
      commands: ['npm run dev', 'npm run build', 'npm run test'],
      tasks: [
        { id: '1', name: 'Dev Server', command: 'npm run dev', description: 'Start development server' },
        { id: '2', name: 'Build', command: 'npm run build', description: 'Build for production' },
        { id: '3', name: 'Test', command: 'npm run test', description: 'Run tests' }
      ]
    },
    { 
      name: 'Node.js Express', 
      type: 'node' as const, 
      commands: ['npm start', 'npm run dev', 'npm test'],
      tasks: [
        { id: '1', name: 'Start', command: 'npm start', description: 'Start server' },
        { id: '2', name: 'Dev', command: 'npm run dev', description: 'Start with nodemon' }
      ]
    },
    { 
      name: 'Python Flask', 
      type: 'python' as const, 
      commands: ['python app.py', 'flask run', 'python -m pytest'],
      tasks: [
        { id: '1', name: 'Run App', command: 'python app.py', description: 'Start Flask app' },
        { id: '2', name: 'Flask Dev', command: 'flask run --debug', description: 'Start with debug' }
      ]
    }
  ];

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = () => {
    // Load from localStorage for now
    const saved = localStorage.getItem('primus-projects');
    if (saved) {
      const parsed = JSON.parse(saved);
      setProjects(parsed.map((p: any) => ({
        ...p,
        lastOpened: new Date(p.lastOpened)
      })));
    }
  };

  const saveProjects = (updatedProjects: Project[]) => {
    localStorage.setItem('primus-projects', JSON.stringify(updatedProjects));
    setProjects(updatedProjects);
  };

  const addProject = async (name: string, path: string, type: Project['type']) => {
    const template = projectTemplates.find(t => t.type === type);
    const newProject: Project = {
      id: Date.now().toString(),
      name,
      path,
      type,
      lastOpened: new Date(),
      tasks: template?.tasks || []
    };
    
    const updated = [...projects, newProject];
    saveProjects(updated);
    setShowNewProjectForm(false);
  };

  const openProject = async (project: Project) => {
    try {
      // Update last opened time
      const updated = projects.map(p => 
        p.id === project.id ? { ...p, lastOpened: new Date() } : p
      );
      saveProjects(updated);
      setSelectedProject(project);
      
      // Open project folder
      await window.primus.fs.selectFolder();
    } catch (error) {
      console.error('Failed to open project:', error);
    }
  };

  const runTask = async (project: Project, task: ProjectTask) => {
    try {
      setRunningTasks(prev => new Set([...prev, task.id]));
      
      // Execute task command in the project directory
      const result = await window.primus.terminal.executeCommand(
        `cd "${project.path}" && ${task.command}`
      );

    } catch (error) {
      console.error(`Failed to run task "${task.name}":`, error);
    } finally {
      setRunningTasks(prev => {
        const updated = new Set(prev);
        updated.delete(task.id);
        return updated;
      });
    }
  };

  const createNewProject = async (template: typeof projectTemplates[0]) => {
    try {
      const projectPath = await window.primus.fs.selectFolder();
      if (!projectPath) return;

      const projectName = projectPath.split(/[/\\]/).pop() || 'New Project';
      
      // Create project structure based on template
      let initCommand = '';
      switch (template.type) {
        case 'react':
          initCommand = `cd "${projectPath}" && npx create-react-app . --template typescript`;
          break;
        case 'node':
          initCommand = `cd "${projectPath}" && npm init -y && npm install express`;
          break;
        case 'python':
          initCommand = `cd "${projectPath}" && python -m venv venv && pip install flask`;
          break;
      }
      
      if (initCommand) {
        await window.primus.terminal.executeCommand(initCommand);
      }
      
      await addProject(projectName, projectPath, template.type);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const deleteProject = (projectId: string) => {
    const updated = projects.filter(p => p.id !== projectId);
    saveProjects(updated);
    if (selectedProject?.id === projectId) {
      setSelectedProject(null);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="project-manager">
      <div className="project-manager-header">
        <h2>Project Manager</h2>
        <div className="project-actions">
          <button onClick={() => setShowNewProjectForm(true)} title="New Project">
            ➕
          </button>
          <button onClick={onToggle} title="Close">×</button>
        </div>
      </div>

      <div className="project-manager-content">
        {showNewProjectForm ? (
          <div className="new-project-form">
            <h3>Create New Project</h3>
            <div className="template-grid">
              {projectTemplates.map((template, index) => (
                <div 
                  key={index} 
                  className="template-card"
                  onClick={() => createNewProject(template)}
                >
                  <div className="template-icon">
                    {template.type === 'react' ? '⚛️' : 
                     template.type === 'node' ? '🟢' : 
                     template.type === 'python' ? '🐍' : '📄'}
                  </div>
                  <div className="template-info">
                    <h4>{template.name}</h4>
                    <p>{template.commands.join(', ')}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="form-actions">
              <button onClick={() => setShowNewProjectForm(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <div className="projects-list">
              <h3>Recent Projects</h3>
              {projects.length === 0 ? (
                <p className="no-projects">No projects found. Create your first project!</p>
              ) : (
                projects
                  .sort((a, b) => b.lastOpened.getTime() - a.lastOpened.getTime())
                  .map(project => (
                    <div 
                      key={project.id} 
                      className={`project-item ${selectedProject?.id === project.id ? 'selected' : ''}`}
                    >
                      <div className="project-info" onClick={() => openProject(project)}>
                        <div className="project-icon">
                          {project.type === 'react' ? '⚛️' : 
                           project.type === 'node' ? '🟢' : 
                           project.type === 'python' ? '🐍' : '📄'}
                        </div>
                        <div className="project-details">
                          <h4>{project.name}</h4>
                          <p className="project-path">{project.path}</p>
                          <p className="project-last-opened">
                            Last opened: {project.lastOpened.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="project-actions-menu">
                        <button 
                          onClick={() => deleteProject(project.id)}
                          title="Delete project"
                          className="delete-btn"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>

            {selectedProject && (
              <div className="project-tasks">
                <h3>Tasks for {selectedProject.name}</h3>
                <div className="tasks-grid">
                  {selectedProject.tasks?.map(task => (
                    <div key={task.id} className="task-card">
                      <div className="task-info">
                        <h4>{task.name}</h4>
                        <p>{task.description}</p>
                        <code>{task.command}</code>
                      </div>
                      <button 
                        onClick={() => runTask(selectedProject, task)}
                        disabled={runningTasks.has(task.id)}
                        className="run-task-btn"
                      >
                        {runningTasks.has(task.id) ? '⏳' : '▶️'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProjectManager;
