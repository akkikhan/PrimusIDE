import React, { useState } from 'react';

interface KeyboardShortcutsProps {
  isVisible: boolean;
  onClose: () => void;
}

interface ShortcutGroup {
  category: string;
  icon: string;
  shortcuts: Array<{
    action: string;
    keys: string;
    description?: string;
  }>;
}

const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({ isVisible, onClose }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('General');

  const shortcutGroups: ShortcutGroup[] = [
    {
      category: 'General',
      icon: '⚙️',
      shortcuts: [
        { action: 'Command Palette', keys: 'Ctrl+Shift+P', description: 'Show all available commands' },
        { action: 'Quick Open', keys: 'Ctrl+P', description: 'Quickly open files by name' },
        { action: 'Settings', keys: 'Ctrl+,', description: 'Open user settings' },
        { action: 'Keyboard Shortcuts', keys: 'Ctrl+K Ctrl+S', description: 'Show keyboard shortcuts' },
        { action: 'Reload Window', keys: 'Ctrl+R', description: 'Reload the window' },
        { action: 'Toggle Developer Tools', keys: 'F12', description: 'Show developer tools' },
        { action: 'Close Window', keys: 'Alt+F4', description: 'Close the application window' }
      ]
    },
    {
      category: 'File Management',
      icon: '📁',
      shortcuts: [
        { action: 'New File', keys: 'Ctrl+N', description: 'Create a new file' },
        { action: 'Open File', keys: 'Ctrl+O', description: 'Open an existing file' },
        { action: 'Save File', keys: 'Ctrl+S', description: 'Save the current file' },
        { action: 'Save As', keys: 'Ctrl+Shift+S', description: 'Save file with a new name' },
        { action: 'Close File', keys: 'Ctrl+W', description: 'Close the current file' }
      ]
    },
    {
      category: 'Theme & Appearance',
      icon: '🎨',
      shortcuts: [
        { action: 'Theme Customizer', keys: 'Ctrl+Shift+T', description: 'Open advanced theme customizer with live preview' },
        { action: 'Toggle Theme', keys: 'Ctrl+K T', description: 'Quick toggle between light and dark themes' }
      ]
    },
    {
      category: 'Editor',
      icon: '✏️',
      shortcuts: [
        { action: 'Undo', keys: 'Ctrl+Z', description: 'Undo the last action' },
        { action: 'Redo', keys: 'Ctrl+Y', description: 'Redo the last undone action' },
        { action: 'Cut', keys: 'Ctrl+X', description: 'Cut selected text' },
        { action: 'Copy', keys: 'Ctrl+C', description: 'Copy selected text' },
        { action: 'Paste', keys: 'Ctrl+V', description: 'Paste text from clipboard' },
        { action: 'Select All', keys: 'Ctrl+A', description: 'Select all text' },
        { action: 'Find', keys: 'Ctrl+F', description: 'Find text in current file' },
        { action: 'Replace', keys: 'Ctrl+H', description: 'Find and replace text' },
        { action: 'Go to Line', keys: 'Ctrl+G', description: 'Jump to a specific line number' },
        { action: 'Format Document', keys: 'Shift+Alt+F', description: 'Format the current document' }
      ]
    },
    {
      category: 'Navigation',
      icon: '🧭',
      shortcuts: [
        { action: 'Go to Definition', keys: 'F12', description: 'Go to symbol definition' },
        { action: 'Peek Definition', keys: 'Alt+F12', description: 'Peek at symbol definition' },
        { action: 'Go Back', keys: 'Alt+Left', description: 'Navigate back in history' },
        { action: 'Go Forward', keys: 'Alt+Right', description: 'Navigate forward in history' },
        { action: 'Switch Tab', keys: 'Ctrl+Tab', description: 'Switch between open tabs' },
        { action: 'Next Tab', keys: 'Ctrl+PageDown', description: 'Move to next tab' },
        { action: 'Previous Tab', keys: 'Ctrl+PageUp', description: 'Move to previous tab' }
      ]
    },
    {
      category: 'View',
      icon: '👁️',
      shortcuts: [
        { action: 'Toggle Terminal', keys: 'Ctrl+`', description: 'Show/hide integrated terminal' },
        { action: 'Toggle Search', keys: 'Ctrl+Shift+F', description: 'Show/hide search panel' },
        { action: 'Toggle Extensions', keys: 'Ctrl+Shift+X', description: 'Show/hide extensions panel' },
        { action: 'Toggle Explorer', keys: 'Ctrl+Shift+E', description: 'Show/hide file explorer' },
        { action: 'Zoom In', keys: 'Ctrl++', description: 'Increase editor zoom' },
        { action: 'Zoom Out', keys: 'Ctrl+-', description: 'Decrease editor zoom' },
        { action: 'Reset Zoom', keys: 'Ctrl+0', description: 'Reset editor zoom to default' }
      ]
    },
    {
      category: 'Search',
      icon: '🔍',
      shortcuts: [
        { action: 'Find in Files', keys: 'Ctrl+Shift+F', description: 'Search across all files' },
        { action: 'Replace in Files', keys: 'Ctrl+Shift+H', description: 'Replace across all files' },
        { action: 'Find Next', keys: 'F3', description: 'Find next occurrence' },
        { action: 'Find Previous', keys: 'Shift+F3', description: 'Find previous occurrence' },
        { action: 'Toggle Case Sensitive', keys: 'Alt+C', description: 'Toggle case sensitive search' },
        { action: 'Toggle Regex', keys: 'Alt+R', description: 'Toggle regular expression search' },
        { action: 'Toggle Whole Word', keys: 'Alt+W', description: 'Toggle whole word search' }
      ]
    },
    {
      category: 'Terminal',
      icon: '💻',
      shortcuts: [
        { action: 'New Terminal', keys: 'Ctrl+Shift+`', description: 'Create new terminal instance' },
        { action: 'Kill Terminal', keys: 'Ctrl+Shift+K', description: 'Terminate current terminal' },
        { action: 'Clear Terminal', keys: 'Ctrl+K', description: 'Clear terminal output' },
        { action: 'Copy Terminal Selection', keys: 'Ctrl+C', description: 'Copy selected text in terminal' },
        { action: 'Paste in Terminal', keys: 'Ctrl+V', description: 'Paste text into terminal' }
      ]
    }
  ];

  const filteredGroups = shortcutGroups.map(group => ({
    ...group,
    shortcuts: group.shortcuts.filter(shortcut =>
      searchQuery === '' ||
      shortcut.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shortcut.keys.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (shortcut.description && shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  })).filter(group => group.shortcuts.length > 0);

  const activeGroup = filteredGroups.find(group => group.category === activeCategory) || filteredGroups[0];

  if (!isVisible) {
    return null;
  }

  return (
    <div className="keyboard-shortcuts">
      <div className="shortcuts-header">
        <div className="shortcuts-title">
          <h2>⌨️ Keyboard Shortcuts</h2>
          <p>Learn and customize keyboard shortcuts for Primus IDE</p>
        </div>
        <div className="shortcuts-actions">
          <button className="shortcuts-btn-secondary" title="Print shortcuts reference">
            🖨️ Print
          </button>
          <button className="shortcuts-btn-secondary" title="Export shortcuts to file">
            📤 Export
          </button>
          <button className="shortcuts-btn-close" onClick={onClose} title="Close shortcuts panel">
            ✕ Close
          </button>
        </div>
      </div>

      <div className="shortcuts-content">
        <div className="shortcuts-sidebar">
          <div className="shortcuts-search">
            <input
              type="text"
              placeholder="Search shortcuts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="shortcuts-search-input"
              aria-label="Search keyboard shortcuts"
            />
          </div>
          <div className="shortcuts-categories">
            {filteredGroups.map(group => (
              <button
                key={group.category}
                className={`shortcuts-category ${activeCategory === group.category ? 'active' : ''}`}
                onClick={() => setActiveCategory(group.category)}
                title={`Show ${group.category} shortcuts`}
              >
                <span className="category-icon">{group.icon}</span>
                <span className="category-name">{group.category}</span>
                <span className="category-count">({group.shortcuts.length})</span>
              </button>
            ))}
          </div>
        </div>

        <div className="shortcuts-main">
          {activeGroup && (
            <>
              <div className="shortcuts-group-header">
                <h3>
                  <span className="group-icon">{activeGroup.icon}</span>
                  {activeGroup.category} Shortcuts
                </h3>
                <p className="group-description">
                  {activeGroup.shortcuts.length} shortcut{activeGroup.shortcuts.length !== 1 ? 's' : ''} available
                </p>
              </div>
              <div className="shortcuts-list">
                {activeGroup.shortcuts.map((shortcut, index) => (
                  <div key={index} className="shortcut-item">
                    <div className="shortcut-info">
                      <div className="shortcut-action">{shortcut.action}</div>
                      {shortcut.description && (
                        <div className="shortcut-description">{shortcut.description}</div>
                      )}
                    </div>
                    <div className="shortcut-keys">
                      {shortcut.keys.split(' ').map((key, keyIndex) => (
                        <React.Fragment key={keyIndex}>
                          <kbd className="shortcut-key">{key}</kbd>
                          {keyIndex < shortcut.keys.split(' ').length - 1 && (
                            <span className="key-separator">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {filteredGroups.length === 0 && (
            <div className="shortcuts-empty">
              <div className="empty-icon">🔍</div>
              <h4>No shortcuts found</h4>
              <p>Try adjusting your search query or browse different categories.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcuts;
