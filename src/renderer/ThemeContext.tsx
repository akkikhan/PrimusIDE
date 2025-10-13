import React, { createContext, useContext, useState, useEffect } from 'react';

export type Theme = 'dark' | 'light' | 'auto';

export interface ThemeContextType {
  theme: Theme;
  effectiveTheme: 'dark' | 'light';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

const getSystemTheme = (): 'dark' | 'light' => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
};

const getEffectiveTheme = (theme: Theme): 'dark' | 'light' => {
  if (theme === 'auto') {
    return getSystemTheme();
  }
  return theme;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Load theme from localStorage or default to 'dark'
    const savedTheme = localStorage.getItem('primus-theme');
    return (savedTheme as Theme) || 'dark';
  });

  const [effectiveTheme, setEffectiveTheme] = useState<'dark' | 'light'>(() => 
    getEffectiveTheme(theme)
  );

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (theme !== 'auto') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      setEffectiveTheme(getSystemTheme());
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Inject / update CSS tokens + Monaco theme when theme changes
  useEffect(() => {
    const newEffectiveTheme = getEffectiveTheme(theme);
    setEffectiveTheme(newEffectiveTheme);
    document.documentElement.setAttribute('data-theme', newEffectiveTheme);
    document.documentElement.className = newEffectiveTheme === 'dark' ? 'dark-theme' : 'light-theme';

    // Core design tokens (add more as needed) – keep list consolidated here for now
    const darkTokens: Record<string,string> = {
      '--color-bg': '#121212',
      '--color-bg-alt': '#1e1e1e',
      '--color-border': '#333',
      '--color-border-strong': '#555',
      '--color-text': '#e6e6e6',
      '--color-text-muted': '#aaa',
      '--color-accent': '#4e9eff',
      '--color-danger': '#ff5f56',
      '--color-badge-bg': '#222',
      '--color-badge-border': '#333',
      '--color-badge-bg-dropped': '#402020',
      '--color-badge-border-dropped': '#553',
    };
    const lightTokens: Record<string,string> = {
      '--color-bg': '#fafafa',
      '--color-bg-alt': '#ffffff',
      '--color-border': '#d0d0d0',
      '--color-border-strong': '#b0b0b0',
      '--color-text': '#222',
      '--color-text-muted': '#555',
      '--color-accent': '#0066cc',
      '--color-danger': '#c62828',
      '--color-badge-bg': '#f0f0f0',
      '--color-badge-border': '#ccc',
      '--color-badge-bg-dropped': '#ffe5e5',
      '--color-badge-border-dropped': '#e0aaaa',
    };
    const tokens = newEffectiveTheme === 'dark' ? darkTokens : lightTokens;
    for (const [k,v] of Object.entries(tokens)) {
      document.documentElement.style.setProperty(k,v);
    }

    // Sync Monaco theme
    try {
      const monaco = (window as any).monaco;
      if(monaco?.editor?.defineTheme) {
        const isDark = newEffectiveTheme === 'dark';
        monaco.editor.defineTheme('primus-theme', {
          base: isDark ? 'vs-dark' : 'vs',
          inherit: true,
            rules: [
            { token: 'comment', foreground: isDark ? '6A9955' : '008000' },
            { token: 'keyword', foreground: isDark ? 'C586C0' : 'AF00DB' },
            { token: 'string', foreground: isDark ? 'CE9178' : 'A31515' },
          ],
          colors: {
            'editor.background': tokens['--color-bg-alt'],
            'editor.foreground': tokens['--color-text'],
            'editor.lineHighlightBackground': isDark ? '#2a2a2a' : '#f0f9ff',
            'editorCursor.foreground': tokens['--color-accent'],
            'editorLineNumber.foreground': isDark ? '#555' : '#999',
            'editor.selectionBackground': isDark ? '#264f78' : '#add6ff',
          }
        });
        monaco.editor.setTheme('primus-theme');
      }
    } catch {/* ignore monaco theme issues */}
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('primus-theme', newTheme);
  };

  const toggleTheme = () => {
    const newTheme = effectiveTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        effectiveTheme,
        setTheme,
        toggleTheme
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
