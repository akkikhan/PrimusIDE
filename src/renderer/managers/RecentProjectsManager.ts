import { IRecentProject } from '@shared/types';

const MAX_RECENT_PROJECTS = 10;
const RECENT_PROJECTS_KEY = 'recentProjects';

export class RecentProjectsManager {
  static getRecentProjects(): IRecentProject[] {
    try {
      const projectsJson = localStorage.getItem(RECENT_PROJECTS_KEY);
      if (projectsJson) {
        const projects = JSON.parse(projectsJson) as IRecentProject[];
        return projects.filter(p => p.path && p.name);
      }
    } catch (error) {
      console.error('Error reading recent projects from localStorage:', error);
    }
    return [];
  }

  static addProject(projectPath: string): IRecentProject[] {
    if (!projectPath) {
      return this.getRecentProjects();
    }

    const projectName = projectPath.split(/[\\/]/).pop() || 'Untitled Project';
    let projects = this.getRecentProjects();

    // Remove any existing project with the same path to avoid duplicates
    projects = projects.filter(p => p.path !== projectPath);

    // Add the new project to the top of the list
    const newProject: IRecentProject = {
      name: projectName,
      path: projectPath,
      lastOpened: new Date().toISOString(),
    };
    projects.unshift(newProject);

    // Limit the number of recent projects
    if (projects.length > MAX_RECENT_PROJECTS) {
      projects = projects.slice(0, MAX_RECENT_PROJECTS);
    }

    try {
      localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(projects));
    } catch (error) {
      console.error('Error saving recent projects to localStorage:', error);
    }

    return projects;
  }

  static removeProject(projectPath: string): IRecentProject[] {
    let projects = this.getRecentProjects();
    projects = projects.filter(p => p.path !== projectPath);

    try {
      localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(projects));
    } catch (error) {
      console.error('Error saving recent projects to localStorage:', error);
    }

    return projects;
  }
}
