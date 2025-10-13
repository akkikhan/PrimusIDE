/**
 * Primus IDE JavaScript Demo
 * Showcasing modern JavaScript features and syntax highlighting
 * @author Primus IDE Team
 * @version 1.0.0
 */

// ES6+ Import/Export Syntax
import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';

// Modern JavaScript Class with Private Fields
class ProjectManager extends EventEmitter {
    // Private fields (ES2022)
    #projects = new Map();
    #activeProject = null;
    #config = {
        maxProjects: 10,
        autoSave: true,
        backupInterval: 5000
    };

    constructor(options = {}) {
        super();
        this.#config = { ...this.#config, ...options };
        this.init();
    }

    // Async initialization
    async init() {
        try {
            await this.loadProjects();
            this.startAutoBackup();
            this.emit('ready', this.#projects.size);
        } catch (error) {
            this.emit('error', error);
        }
    }

    // Getter/Setter with validation
    get activeProject() {
        return this.#activeProject;
    }

    set activeProject(projectId) {
        if (!this.#projects.has(projectId)) {
            throw new Error(`Project '${projectId}' not found`);
        }
        this.#activeProject = projectId;
        this.emit('projectChanged', projectId);
    }

    // Method with default parameters and destructuring
    async createProject({ 
        name, 
        type = 'web', 
        template = 'blank',
        dependencies = [],
        settings = {}
    }) {
        // Input validation with optional chaining
        if (!name?.trim()) {
            throw new Error('Project name is required');
        }

        // Check project limit
        if (this.#projects.size >= this.#config.maxProjects) {
            throw new Error(`Maximum ${this.#config.maxProjects} projects allowed`);
        }

        const projectId = this.generateId();
        const project = {
            id: projectId,
            name: name.trim(),
            type,
            template,
            dependencies,
            settings,
            created: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            files: new Map(),
            status: 'active'
        };

        // Use Map for efficient storage
        this.#projects.set(projectId, project);
        
        // Emit event with project data
        this.emit('projectCreated', { project, totalProjects: this.#projects.size });
        
        return project;
    }

    // Async method with error handling
    async loadProject(projectId) {
        try {
            const project = this.#projects.get(projectId);
            if (!project) {
                throw new Error(`Project ${projectId} not found`);
            }

            // Simulate file loading with Promise.all for parallel execution
            const files = await Promise.all([
                this.loadProjectFiles(project),
                this.loadProjectConfig(project),
                this.loadProjectDependencies(project)
            ]);

            const [projectFiles, config, deps] = files;
            
            return {
                ...project,
                files: projectFiles,
                config,
                dependencies: deps
            };
        } catch (error) {
            console.error(`Failed to load project ${projectId}:`, error);
            throw error;
        }
    }

    // Generator function for iterating projects
    * getAllProjects() {
        for (const [id, project] of this.#projects) {
            yield { id, ...project };
        }
    }

    // Array methods with modern syntax
    getProjectsByType(type) {
        return Array.from(this.#projects.values())
            .filter(project => project.type === type)
            .map(({ id, name, created, status }) => ({ id, name, created, status }))
            .sort((a, b) => new Date(b.created) - new Date(a.created));
    }

    // Method with rest parameters and spread operator
    updateProject(projectId, ...updates) {
        const project = this.#projects.get(projectId);
        if (!project) {
            throw new Error(`Project ${projectId} not found`);
        }

        // Merge updates using spread operator
        const updatedProject = {
            ...project,
            ...Object.assign({}, ...updates),
            lastModified: new Date().toISOString()
        };

        this.#projects.set(projectId, updatedProject);
        this.emit('projectUpdated', { projectId, project: updatedProject });
        
        return updatedProject;
    }

    // Async method with timeout
    async saveProject(projectId, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error('Save operation timed out'));
            }, timeout);

            const project = this.#projects.get(projectId);
            if (!project) {
                clearTimeout(timer);
                reject(new Error(`Project ${projectId} not found`));
                return;
            }

            // Simulate async save operation
            setImmediate(async () => {
                try {
                    await this.writeProjectData(project);
                    clearTimeout(timer);
                    resolve({ saved: true, timestamp: new Date().toISOString() });
                } catch (error) {
                    clearTimeout(timer);
                    reject(error);
                }
            });
        });
    }

    // Private method using Symbol for true privacy (alternative approach)
    #startAutoBackup() {
        if (!this.#config.autoSave) return;

        setInterval(async () => {
            try {
                for (const [id, project] of this.#projects) {
                    if (project.status === 'active') {
                        await this.saveProject(id);
                    }
                }
                this.emit('autoBackupComplete', this.#projects.size);
            } catch (error) {
                this.emit('autoBackupError', error);
            }
        }, this.#config.backupInterval);
    }

    // Method using nullish coalescing and logical assignment
    getProjectStats(projectId) {
        const project = this.#projects.get(projectId);
        if (!project) return null;

        // Nullish coalescing operator
        const fileCount = project.files?.size ?? 0;
        const depCount = project.dependencies?.length ?? 0;
        
        // Logical assignment operators (ES2021)
        project.stats ??= {};
        project.stats.lastAccessed ??= new Date().toISOString();
        
        return {
            id: projectId,
            name: project.name,
            fileCount,
            dependencyCount: depCount,
            created: project.created,
            lastModified: project.lastModified,
            lastAccessed: project.stats.lastAccessed
        };
    }

    // Static method for utilities
    static validateProjectName(name) {
        // RegExp with named capture groups
        const namePattern = /^(?<prefix>[a-zA-Z])(?<body>[a-zA-Z0-9-_]*[a-zA-Z0-9])?$/;
        const match = name.match(namePattern);
        
        return {
            isValid: !!match,
            prefix: match?.groups?.prefix,
            body: match?.groups?.body,
            suggestions: match ? [] : ProjectManager.generateNameSuggestions(name)
        };
    }

    static generateNameSuggestions(invalidName) {
        return [
            invalidName.replace(/[^a-zA-Z0-9-_]/g, '-'),
            `project-${invalidName.toLowerCase().replace(/\s+/g, '-')}`,
            `my-${invalidName.slice(0, 10).replace(/\W/g, '')}-app`
        ].filter(name => ProjectManager.validateProjectName(name).isValid);
    }

    // Method using template literals and tagged templates
    generateId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `project_${timestamp}_${random}`;
    }

    // Async cleanup method
    async destroy() {
        try {
            // Save all projects before cleanup
            const savePromises = Array.from(this.#projects.keys())
                .map(id => this.saveProject(id));
            
            await Promise.allSettled(savePromises);
            
            // Clear data structures
            this.#projects.clear();
            this.#activeProject = null;
            
            // Remove all listeners
            this.removeAllListeners();
            
            console.log('ProjectManager destroyed successfully');
        } catch (error) {
            console.error('Error during cleanup:', error);
            throw error;
        }
    }

    // Helper methods (would be implemented)
    async loadProjects() {
        // Implementation would load from storage
        console.log('Loading projects from storage...');
    }

    async loadProjectFiles(project) {
        // Implementation would load project files
        return new Map();
    }

    async loadProjectConfig(project) {
        // Implementation would load project config
        return {};
    }

    async loadProjectDependencies(project) {
        // Implementation would load dependencies
        return [];
    }

    async writeProjectData(project) {
        // Implementation would write to storage
        console.log(`Saving project: ${project.name}`);
    }

    // Alias methods for convenience
    startAutoBackup = this.#startAutoBackup.bind(this);
}

// Utility functions using modern features

// Async function with error boundary
export async function withErrorBoundary(fn, fallback = null) {
    try {
        return await fn();
    } catch (error) {
        console.error('Error caught by boundary:', error);
        return fallback;
    }
}

// Function using optional chaining and nullish coalescing
export function safeGet(obj, path, defaultValue = null) {
    return path.split('.')
        .reduce((current, key) => current?.[key], obj) ?? defaultValue;
}

// Higher-order function for debouncing
export function debounce(func, delay = 300) {
    let timeoutId;
    return function debounced(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// Function using WeakMap for private data
const privateData = new WeakMap();

export class FileWatcher {
    constructor(options = {}) {
        privateData.set(this, {
            watchers: new Set(),
            options,
            isActive: false
        });
    }

    watch(filePath, callback) {
        const data = privateData.get(this);
        const watcher = { filePath, callback, id: Math.random() };
        data.watchers.add(watcher);
        return () => data.watchers.delete(watcher);
    }

    get isActive() {
        return privateData.get(this)?.isActive ?? false;
    }
}

// Module-level code with top-level await (ES2022)
try {
    // This would work in environments supporting top-level await
    // const config = await import('./config.json', { assert: { type: 'json' } });
    console.log('Primus IDE JavaScript Demo loaded successfully!');
} catch (error) {
    console.error('Failed to load configuration:', error);
}

// Export default class
export default ProjectManager;

// Re-export for convenience
export { ProjectManager };

// Example usage with modern syntax
if (typeof window !== 'undefined') {
    // Browser environment
    window.addEventListener('DOMContentLoaded', async () => {
        const projectManager = new ProjectManager({
            maxProjects: 5,
            autoSave: true
        });

        // Event listeners with arrow functions
        projectManager.on('projectCreated', ({ project, totalProjects }) => {
            console.log(`Created project: ${project.name} (Total: ${totalProjects})`);
        });

        projectManager.on('error', error => {
            console.error('ProjectManager error:', error);
        });

        // Example project creation
        try {
            const webProject = await projectManager.createProject({
                name: 'My Awesome Web App',
                type: 'web',
                template: 'react-typescript',
                dependencies: ['react', 'typescript', 'webpack']
            });

            console.log('Project created successfully:', webProject);
        } catch (error) {
            console.error('Failed to create project:', error);
        }
    });
} else {
    // Node.js environment
    console.log('Running in Node.js environment');
}
