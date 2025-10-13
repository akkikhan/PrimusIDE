import React, { createContext, useContext, useState, useEffect } from 'react';

// Enhanced Theme Interface
export interface ThemeColors {
  // Base colors
  background: string;
  foreground: string;
  muted: string;
  accent: string;
  
  // Editor colors
  editorBackground: string;
  editorForeground: string;
  editorLineHighlight: string;
  editorSelection: string;
  editorCursor: string;
  
  // UI colors
  sidebarBackground: string;
  sidebarForeground: string;
  activityBarBackground: string;
  activityBarForeground: string;
  statusBarBackground: string;
  statusBarForeground: string;
  
  // Panel colors
  panelBackground: string;
  panelBorder: string;
  tabActiveBackground: string;
  tabInactiveBackground: string;
  
  // Interactive colors
  buttonBackground: string;
  buttonForeground: string;
  buttonHover: string;
  inputBackground: string;
  inputBorder: string;
  inputFocus: string;
  
  // Semantic colors
  errorColor: string;
  warningColor: string;
  infoColor: string;
  successColor: string;
  
  // AI Chat colors
  userMessageBackground: string;
  assistantMessageBackground: string;
  codeBlockBackground: string;
  
  // Git colors
  gitAdded: string;
  gitModified: string;
  gitDeleted: string;
  gitConflict: string;
}

export interface ThemeFonts {
  family: string;
  monoFamily: string;
  size: string;
  lineHeight: string;
  weight: string;
}

export interface ThemeSpacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  borderRadius: string;
  borderWidth: string;
}

export interface ThemeAnimations {
  duration: string;
  easing: string;
  hoverTransition: string;
}

export interface ThemeShadows {
  small: string;
  medium: string;
  large: string;
  panel: string;
}

export interface AdvancedTheme {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  isCustom: boolean;
  colors: ThemeColors;
  fonts: ThemeFonts;
  spacing: ThemeSpacing;
  animations: ThemeAnimations;
  shadows: ThemeShadows;
}

// Built-in themes
const DARK_PROFESSIONAL: AdvancedTheme = {
  id: 'dark-professional',
  name: 'Dark Professional',
  description: 'Professional dark theme with excellent contrast',
  version: '1.0.0',
  author: 'Primus IDE Team',
  isCustom: false,
  colors: {
    background: '#1e1e1e',
    foreground: '#cccccc',
    muted: '#6a737d',
    accent: '#007acc',
    editorBackground: '#1e1e1e',
    editorForeground: '#d4d4d4',
    editorLineHighlight: '#2d2d30',
    editorSelection: '#264f78',
    editorCursor: '#ffffff',
    sidebarBackground: '#252526',
    sidebarForeground: '#cccccc',
    activityBarBackground: '#2c2c2c',
    activityBarForeground: '#ffffff',
    statusBarBackground: '#007acc',
    statusBarForeground: '#ffffff',
    panelBackground: '#1e1e1e',
    panelBorder: '#3c3c3c',
    tabActiveBackground: '#1e1e1e',
    tabInactiveBackground: '#2d2d30',
    buttonBackground: '#0e639c',
    buttonForeground: '#ffffff',
    buttonHover: '#1177bb',
    inputBackground: '#3c3c3c',
    inputBorder: '#6c6c6c',
    inputFocus: '#007acc',
    errorColor: '#f14c4c',
    warningColor: '#ffb366',
    infoColor: '#75beff',
    successColor: '#89d185',
    userMessageBackground: '#007acc',
    assistantMessageBackground: '#3c3c3c',
    codeBlockBackground: '#2d2d30',
    gitAdded: '#89d185',
    gitModified: '#ffb366',
    gitDeleted: '#f14c4c',
    gitConflict: '#c5c5c5'
  },
  fonts: {
    family: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
    monoFamily: '"Fira Code", "Cascadia Code", Consolas, "Courier New", monospace',
    size: '14px',
    lineHeight: '1.5',
    weight: '400'
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    borderRadius: '4px',
    borderWidth: '1px'
  },
  animations: {
    duration: '200ms',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    hoverTransition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)'
  },
  shadows: {
    small: '0 1px 3px rgba(0, 0, 0, 0.12)',
    medium: '0 4px 6px rgba(0, 0, 0, 0.16)',
    large: '0 10px 25px rgba(0, 0, 0, 0.19)',
    panel: '0 2px 8px rgba(0, 0, 0, 0.15)'
  }
};

const LIGHT_PROFESSIONAL: AdvancedTheme = {
  id: 'light-professional',
  name: 'Light Professional',
  description: 'Clean light theme for daytime coding',
  version: '1.0.0',
  author: 'Primus IDE Team',
  isCustom: false,
  colors: {
    background: '#ffffff',
    foreground: '#333333',
    muted: '#6a737d',
    accent: '#0066cc',
    editorBackground: '#ffffff',
    editorForeground: '#333333',
    editorLineHighlight: '#f3f3f3',
    editorSelection: '#add6ff',
    editorCursor: '#000000',
    sidebarBackground: '#f8f8f8',
    sidebarForeground: '#333333',
    activityBarBackground: '#2c2c2c',
    activityBarForeground: '#ffffff',
    statusBarBackground: '#0066cc',
    statusBarForeground: '#ffffff',
    panelBackground: '#ffffff',
    panelBorder: '#e1e4e8',
    tabActiveBackground: '#ffffff',
    tabInactiveBackground: '#f3f3f3',
    buttonBackground: '#0066cc',
    buttonForeground: '#ffffff',
    buttonHover: '#0052a3',
    inputBackground: '#ffffff',
    inputBorder: '#d1d9e0',
    inputFocus: '#0066cc',
    errorColor: '#d73a49',
    warningColor: '#f66a0a',
    infoColor: '#0366d6',
    successColor: '#28a745',
    userMessageBackground: '#0066cc',
    assistantMessageBackground: '#f6f8fa',
    codeBlockBackground: '#f3f3f3',
    gitAdded: '#28a745',
    gitModified: '#f66a0a',
    gitDeleted: '#d73a49',
    gitConflict: '#6f42c1'
  },
  fonts: {
    family: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
    monoFamily: '"Fira Code", "Cascadia Code", Consolas, "Courier New", monospace',
    size: '14px',
    lineHeight: '1.5',
    weight: '400'
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    borderRadius: '4px',
    borderWidth: '1px'
  },
  animations: {
    duration: '200ms',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    hoverTransition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)'
  },
  shadows: {
    small: '0 1px 3px rgba(0, 0, 0, 0.12)',
    medium: '0 4px 6px rgba(0, 0, 0, 0.16)',
    large: '0 10px 25px rgba(0, 0, 0, 0.19)',
    panel: '0 2px 8px rgba(0, 0, 0, 0.15)'
  }
};

const HIGH_CONTRAST: AdvancedTheme = {
  id: 'high-contrast',
  name: 'High Contrast',
  description: 'High contrast theme for accessibility',
  version: '1.0.0',
  author: 'Primus IDE Team',
  isCustom: false,
  colors: {
    background: '#000000',
    foreground: '#ffffff',
    muted: '#c0c0c0',
    accent: '#ffff00',
    editorBackground: '#000000',
    editorForeground: '#ffffff',
    editorLineHighlight: '#1a1a1a',
    editorSelection: '#0080ff',
    editorCursor: '#ffff00',
    sidebarBackground: '#000000',
    sidebarForeground: '#ffffff',
    activityBarBackground: '#000000',
    activityBarForeground: '#ffffff',
    statusBarBackground: '#ffffff',
    statusBarForeground: '#000000',
    panelBackground: '#000000',
    panelBorder: '#ffffff',
    tabActiveBackground: '#000000',
    tabInactiveBackground: '#1a1a1a',
    buttonBackground: '#ffffff',
    buttonForeground: '#000000',
    buttonHover: '#c0c0c0',
    inputBackground: '#000000',
    inputBorder: '#ffffff',
    inputFocus: '#ffff00',
    errorColor: '#ff0000',
    warningColor: '#ffff00',
    infoColor: '#00ffff',
    successColor: '#00ff00',
    userMessageBackground: '#0080ff',
    assistantMessageBackground: '#1a1a1a',
    codeBlockBackground: '#1a1a1a',
    gitAdded: '#00ff00',
    gitModified: '#ffff00',
    gitDeleted: '#ff0000',
    gitConflict: '#ff00ff'
  },
  fonts: {
    family: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
    monoFamily: '"Fira Code", "Cascadia Code", Consolas, "Courier New", monospace',
    size: '16px',
    lineHeight: '1.6',
    weight: '500'
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    borderRadius: '2px',
    borderWidth: '2px'
  },
  animations: {
    duration: '150ms',
    easing: 'linear',
    hoverTransition: 'all 150ms linear'
  },
  shadows: {
    small: 'none',
    medium: 'none',
    large: 'none',
    panel: '0 0 0 2px #ffffff'
  }
};

export type ThemeType = 'dark' | 'light' | 'auto' | string;

export interface AdvancedThemeContextType {
  currentTheme: AdvancedTheme;
  themeType: ThemeType;
  availableThemes: AdvancedTheme[];
  setTheme: (themeId: string) => void;
  createCustomTheme: (theme: AdvancedTheme) => void;
  updateCustomTheme: (themeId: string, updates: Partial<AdvancedTheme>) => void;
  deleteCustomTheme: (themeId: string) => void;
  exportTheme: (themeId: string) => string;
  importTheme: (themeJson: string) => boolean;
  applyThemeVariables: () => void;
}

const AdvancedThemeContext = createContext<AdvancedThemeContextType | undefined>(undefined);

export const useAdvancedTheme = () => {
  const context = useContext(AdvancedThemeContext);
  if (context === undefined) {
    throw new Error('useAdvancedTheme must be used within an AdvancedThemeProvider');
  }
  return context;
};

// Theme Management Class
class ThemeManager {
  private static instance: ThemeManager;
  private themes: Map<string, AdvancedTheme> = new Map();
  private currentThemeId: string = 'dark-professional';

  private constructor() {
    // Initialize with built-in themes
    this.themes.set('dark-professional', DARK_PROFESSIONAL);
    this.themes.set('light-professional', LIGHT_PROFESSIONAL);
    this.themes.set('high-contrast', HIGH_CONTRAST);
    
    // Load custom themes from localStorage
    this.loadCustomThemes();
  }

  public static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  public getTheme(themeId: string): AdvancedTheme | undefined {
    return this.themes.get(themeId);
  }

  public getAllThemes(): AdvancedTheme[] {
    return Array.from(this.themes.values());
  }

  public getCurrentTheme(): AdvancedTheme {
    return this.themes.get(this.currentThemeId) || DARK_PROFESSIONAL;
  }

  public setCurrentTheme(themeId: string): boolean {
    if (this.themes.has(themeId)) {
      this.currentThemeId = themeId;
      localStorage.setItem('primus-current-theme', themeId);
      return true;
    }
    return false;
  }

  public createCustomTheme(theme: AdvancedTheme): void {
    theme.isCustom = true;
    this.themes.set(theme.id, theme);
    this.saveCustomThemes();
  }

  public updateCustomTheme(themeId: string, updates: Partial<AdvancedTheme>): void {
    const theme = this.themes.get(themeId);
    if (theme && theme.isCustom) {
      const updatedTheme = { ...theme, ...updates };
      this.themes.set(themeId, updatedTheme);
      this.saveCustomThemes();
    }
  }

  public deleteCustomTheme(themeId: string): boolean {
    const theme = this.themes.get(themeId);
    if (theme && theme.isCustom) {
      this.themes.delete(themeId);
      this.saveCustomThemes();
      if (this.currentThemeId === themeId) {
        this.setCurrentTheme('dark-professional');
      }
      return true;
    }
    return false;
  }

  public exportTheme(themeId: string): string {
    const theme = this.themes.get(themeId);
    if (theme) {
      return JSON.stringify(theme, null, 2);
    }
    throw new Error(`Theme with id "${themeId}" not found`);
  }

  public importTheme(themeJson: string): boolean {
    try {
      const theme: AdvancedTheme = JSON.parse(themeJson);
      // Validate theme structure
      if (this.validateTheme(theme)) {
        theme.isCustom = true;
        this.themes.set(theme.id, theme);
        this.saveCustomThemes();
        return true;
      }
    } catch (error) {
      console.error('Failed to import theme:', error);
    }
    return false;
  }

  private validateTheme(theme: any): theme is AdvancedTheme {
    return (
      typeof theme.id === 'string' &&
      typeof theme.name === 'string' &&
      typeof theme.colors === 'object' &&
      typeof theme.fonts === 'object' &&
      typeof theme.spacing === 'object'
    );
  }

  private loadCustomThemes(): void {
    try {
      const savedThemes = localStorage.getItem('primus-custom-themes');
      if (savedThemes) {
        const customThemes: AdvancedTheme[] = JSON.parse(savedThemes);
        customThemes.forEach(theme => {
          theme.isCustom = true;
          this.themes.set(theme.id, theme);
        });
      }

      const currentThemeId = localStorage.getItem('primus-current-theme');
      if (currentThemeId && this.themes.has(currentThemeId)) {
        this.currentThemeId = currentThemeId;
      }
    } catch (error) {
      console.error('Failed to load custom themes:', error);
    }
  }

  private saveCustomThemes(): void {
    try {
      const customThemes = Array.from(this.themes.values()).filter(theme => theme.isCustom);
      localStorage.setItem('primus-custom-themes', JSON.stringify(customThemes));
    } catch (error) {
      console.error('Failed to save custom themes:', error);
    }
  }
}

export const AdvancedThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeManager] = useState(() => ThemeManager.getInstance());
  const [currentTheme, setCurrentTheme] = useState<AdvancedTheme>(themeManager.getCurrentTheme());
  const [availableThemes, setAvailableThemes] = useState<AdvancedTheme[]>(themeManager.getAllThemes());

  const applyThemeVariables = () => {
    const theme = currentTheme;
    const root = document.documentElement;

    // Apply color variables
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value);
    });

    // Apply font variables
    Object.entries(theme.fonts).forEach(([key, value]) => {
      root.style.setProperty(`--font-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value);
    });

    // Apply spacing variables
    Object.entries(theme.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--spacing-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value);
    });

    // Apply animation variables
    Object.entries(theme.animations).forEach(([key, value]) => {
      root.style.setProperty(`--animation-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value);
    });

    // Apply shadow variables
    Object.entries(theme.shadows).forEach(([key, value]) => {
      root.style.setProperty(`--shadow-${key}`, value);
    });

    // Set theme class
    root.className = `theme-${theme.id}`;
    root.setAttribute('data-theme', theme.id);
  };

  useEffect(() => {
    applyThemeVariables();
  }, [currentTheme]);

  const setTheme = (themeId: string) => {
    if (themeManager.setCurrentTheme(themeId)) {
      setCurrentTheme(themeManager.getCurrentTheme());
    }
  };

  const createCustomTheme = (theme: AdvancedTheme) => {
    themeManager.createCustomTheme(theme);
    setAvailableThemes(themeManager.getAllThemes());
  };

  const updateCustomTheme = (themeId: string, updates: Partial<AdvancedTheme>) => {
    themeManager.updateCustomTheme(themeId, updates);
    setAvailableThemes(themeManager.getAllThemes());
    if (currentTheme.id === themeId) {
      setCurrentTheme(themeManager.getCurrentTheme());
    }
  };

  const deleteCustomTheme = (themeId: string) => {
    if (themeManager.deleteCustomTheme(themeId)) {
      setAvailableThemes(themeManager.getAllThemes());
      if (currentTheme.id === themeId) {
        setCurrentTheme(themeManager.getCurrentTheme());
      }
    }
  };

  const exportTheme = (themeId: string): string => {
    return themeManager.exportTheme(themeId);
  };

  const importTheme = (themeJson: string): boolean => {
    const success = themeManager.importTheme(themeJson);
    if (success) {
      setAvailableThemes(themeManager.getAllThemes());
    }
    return success;
  };

  return (
    <AdvancedThemeContext.Provider
      value={{
        currentTheme,
        themeType: currentTheme.id,
        availableThemes,
        setTheme,
        createCustomTheme,
        updateCustomTheme,
        deleteCustomTheme,
        exportTheme,
        importTheme,
        applyThemeVariables
      }}
    >
      {children}
    </AdvancedThemeContext.Provider>
  );
};
