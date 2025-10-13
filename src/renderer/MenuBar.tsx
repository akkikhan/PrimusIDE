import React, { useState } from 'react';

interface MenuBarProps {
  onNewFile: () => void;
  onOpenFile: () => void;
  onSaveFile: () => void;
  onToggleTerminal: () => void;
  onToggleSearch: () => void;
  onToggleSettings: () => void;
  onTogglePlugins: () => void;
  onShowKeyboardShortcuts: () => void;
  onToggleAIChat?: () => void;
  onToggleAISettings?: () => void;
  onToggleAIAssistant?: () => void;
}

interface MenuItem {
  label?: string;
  shortcut?: string;
  onClick?: () => void;
  separator?: boolean;
  submenu?: MenuItem[];
}

const MenuBar: React.FC<MenuBarProps> = ({
  onNewFile,
  onOpenFile,
  onSaveFile,
  onToggleTerminal,
  onToggleSearch,
  onToggleSettings,
  onTogglePlugins,
  onShowKeyboardShortcuts,
  onToggleAIChat,
  onToggleAISettings,
  onToggleAIAssistant
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isMenuVisible, setIsMenuVisible] = useState<boolean>(false);

  const menus = {
    File: [
      { label: 'New File', shortcut: 'Ctrl+N', onClick: onNewFile },
      { label: 'Open File...', shortcut: 'Ctrl+O', onClick: onOpenFile },
      { separator: true },
      { label: 'Save', shortcut: 'Ctrl+S', onClick: onSaveFile },
      { label: 'Save As...', shortcut: 'Ctrl+Shift+S', onClick: () => console.log('Save As') },
      { separator: true },
      { label: 'Close File', shortcut: 'Ctrl+W', onClick: () => console.log('Close File') },
      { separator: true },
      { label: 'Exit', shortcut: 'Alt+F4', onClick: () => window.close() }
    ],
    Edit: [
      { label: 'Undo', shortcut: 'Ctrl+Z', onClick: () => document.execCommand('undo') },
      { label: 'Redo', shortcut: 'Ctrl+Y', onClick: () => document.execCommand('redo') },
      { separator: true },
      { label: 'Cut', shortcut: 'Ctrl+X', onClick: () => document.execCommand('cut') },
      { label: 'Copy', shortcut: 'Ctrl+C', onClick: () => document.execCommand('copy') },
      { label: 'Paste', shortcut: 'Ctrl+V', onClick: () => document.execCommand('paste') },
      { separator: true },
      { label: 'Select All', shortcut: 'Ctrl+A', onClick: () => document.execCommand('selectAll') },
      { label: 'Find', shortcut: 'Ctrl+F', onClick: onToggleSearch },
      { label: 'Find and Replace', shortcut: 'Ctrl+H', onClick: onToggleSearch }
    ],
    View: [
      { label: 'Command Palette', shortcut: 'Ctrl+Shift+P', onClick: () => {} },
      { separator: true },
      { label: 'Explorer', shortcut: 'Ctrl+Shift+E', onClick: () => {} },
      { label: 'Search', shortcut: 'Ctrl+Shift+F', onClick: onToggleSearch },
      { label: 'Extensions', shortcut: 'Ctrl+Shift+X', onClick: onTogglePlugins },
      { separator: true },
      { label: 'Terminal', shortcut: 'Ctrl+`', onClick: onToggleTerminal },
      { separator: true },
      { label: 'Zoom In', shortcut: 'Ctrl++', onClick: () => {} },
      { label: 'Zoom Out', shortcut: 'Ctrl+-', onClick: () => {} },
      { label: 'Reset Zoom', shortcut: 'Ctrl+0', onClick: () => {} }
    ],
    AI: [
      { label: '🤖 AI Assistant', shortcut: 'Ctrl+Shift+I', onClick: onToggleAIAssistant },
      { label: 'AI Assistant Chat', shortcut: 'Ctrl+Shift+A', onClick: onToggleAIChat },
      { label: 'AI Settings', shortcut: 'Ctrl+Alt+A', onClick: onToggleAISettings },
      { separator: true },
      { label: 'AI Code Completion', onClick: () => {} },
      { label: 'AI Code Analysis', onClick: () => {} }
    ],
    Tools: [
      { label: 'Settings', shortcut: 'Ctrl+,', onClick: onToggleSettings },
      { label: 'Keyboard Shortcuts', shortcut: 'Ctrl+K Ctrl+S', onClick: onShowKeyboardShortcuts },
      { separator: true },
      { label: 'Developer Tools', shortcut: 'F12', onClick: () => {} }
    ],
    Help: [
      { label: 'Welcome', onClick: () => {} },
      { label: 'Documentation', onClick: () => {} },
      { separator: true },
      { label: 'Keyboard Shortcuts Reference', shortcut: 'Ctrl+K Ctrl+R', onClick: onShowKeyboardShortcuts },
      { separator: true },
      { label: 'About Primus IDE', onClick: () => console.log('About Primus IDE') }
    ]
  };

  const handleMenuClick = (menuName: string) => {
    if (activeMenu === menuName) {
      setActiveMenu(null);
      setIsMenuVisible(false);
    } else {
      setActiveMenu(menuName);
      setIsMenuVisible(true);
    }
  };

  const handleMenuItemClick = (item: MenuItem) => {
    if (item.onClick) {
      item.onClick();
    }
    setActiveMenu(null);
    setIsMenuVisible(false);
  };

  const handleClickOutside = () => {
    setActiveMenu(null);
    setIsMenuVisible(false);
  };

  const renderMenuItem = (item: MenuItem, index: number) => {
    if (item.separator) {
      return <div key={index} className="menu-separator"></div>;
    }

    return (
      <div
        key={index}
        className="menu-item"
        onClick={() => handleMenuItemClick(item)}
        title={item.shortcut ? `Shortcut: ${item.shortcut}` : undefined}
      >
        <span className="menu-item-label">{item.label}</span>
        {item.shortcut && <span className="menu-item-shortcut">{item.shortcut}</span>}
      </div>
    );
  };

  return (
    <>
      {isMenuVisible && <div className="menu-overlay" onClick={handleClickOutside}></div>}
      <div className="menu-bar">
        <div className="menu-bar-content">
          <div className="menu-bar-left">
            <div className="app-logo">
              <span className="logo-icon">🚀</span>
              <span className="logo-text">Primus IDE</span>
            </div>
            <div className="menu-items">
              {Object.entries(menus).map(([menuName, menuItems]) => (
                <div key={menuName} className="menu-container">
                  <button
                    className={`menu-button ${activeMenu === menuName ? 'active' : ''}`}
                    onClick={() => handleMenuClick(menuName)}
                    aria-label={`${menuName} menu`}
                  >
                    {menuName}
                  </button>
                  {activeMenu === menuName && (
                    <div className="menu-dropdown">
                      {menuItems.map((item, index) => renderMenuItem(item, index))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="menu-bar-right">
            <div className="menu-status">
              <span className="status-text">Ready</span>
            </div>
            <div className="window-controls">
              <button className="window-control minimize" title="Minimize" aria-label="Minimize window">
                &#8722;
              </button>
              <button className="window-control maximize" title="Maximize" aria-label="Maximize window">
                &#9744;
              </button>
              <button className="window-control close" title="Close" aria-label="Close window">
                &#10005;
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MenuBar;
