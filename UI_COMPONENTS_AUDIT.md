# Primus IDE V2 - UI Components Audit Report
**Date:** November 4, 2025  
**Version:** 2.0  
**Status:** 🔴 Critical Issues Found

---

## Executive Summary

**Total Interactive Elements:** 35  
**Working:** 15 (43%)  
**Broken:** 8 (23%)  
**Not Implemented:** 12 (34%)

### Critical Issues:
1. ❌ **Open Folder button doesn't work** - IPC handler mismatch
2. ❌ **New File button doesn't work** - No handler implemented
3. ❌ **File Explorer doesn't load** - No IPC handler
4. ❌ **Terminal commands don't execute** - IPC missing
5. ❌ **Save doesn't work** - No fs:writeFile handler

---

## 1. Title Bar Components

### 1.1 App Logo
- **Element:** `<div className="app-logo">⚡ Primus IDE</div>`
- **Expected:** Display only (non-interactive)
- **Status:** ✅ WORKING
- **Action:** None

### 1.2 Menu Bar Items
| Menu Item | Status | Handler | Expected Behavior |
|-----------|--------|---------|-------------------|
| File | 🔴 NOT IMPLEMENTED | None | Dropdown: New, Open, Save, Save As, Close |
| Edit | 🔴 NOT IMPLEMENTED | None | Dropdown: Undo, Redo, Cut, Copy, Paste |
| Selection | 🔴 NOT IMPLEMENTED | None | Dropdown: Select All, Expand Selection |
| View | 🔴 NOT IMPLEMENTED | None | Dropdown: Command Palette, Terminal, Problems |
| Go | 🔴 NOT IMPLEMENTED | None | Dropdown: Go to File, Go to Line |
| Run | 🔴 NOT IMPLEMENTED | None | Dropdown: Start Debugging, Run Without Debugging |
| Terminal | 🔴 NOT IMPLEMENTED | None | Dropdown: New Terminal, Split Terminal |
| Help | 🔴 NOT IMPLEMENTED | None | Dropdown: Documentation, About |

### 1.3 Theme Toggle Button
- **Element:** Sun/Moon icon button
- **Handler:** `onClick={toggleTheme}`
- **IPC:** None (local state)
- **Status:** ✅ WORKING
- **Test:** Click toggles between dark/light theme
- **Expected:** Theme switches, icon changes

---

## 2. Activity Bar (Left Sidebar Icons)

### 2.1 Explorer Icon (📁)
- **Handler:** `onClick={() => setActiveView('explorer')}`
- **Status:** ✅ WORKING
- **Test:** Click shows file explorer in sidebar
- **Expected:** Sidebar shows EXPLORER title and file tree

### 2.2 Search Icon (🔍)
- **Handler:** `onClick={() => setActiveView('search')}`
- **Status:** ⚠️ PARTIAL - UI works, search not implemented
- **Test:** Click shows "Search functionality coming soon..."
- **Expected:** Search panel with input field

### 2.3 Git Icon (⚡)
- **Handler:** `onClick={() => setActiveView('git')}`
- **Status:** ⚠️ PARTIAL - UI works, git not implemented
- **Test:** Click shows "Git integration coming soon..."
- **Expected:** Git status, changes, commits

### 2.4 Extensions Icon (□)
- **Handler:** `onClick={() => setActiveView('extensions')}`
- **Status:** ⚠️ PARTIAL - UI works, extensions not implemented
- **Test:** Click shows "Extensions marketplace coming soon..."
- **Expected:** Extension list and search

### 2.5 AI Icon (⭐)
- **Handler:** `onClick={() => setActiveView('ai')}`
- **Status:** ✅ WORKING
- **Test:** Click shows AI assistant panel with "Show Chat" button
- **Expected:** AI sidebar with Mistral integration

---

## 3. Sidebar Components

### 3.1 Open Folder Button (in Explorer view)
- **Element:** 📁 icon button in sidebar header
- **Handler:** `onClick={handleOpenFolder}`
- **IPC Call:** `window.primus.dialog.showOpenDialog({ properties: ['openDirectory'] })`
- **IPC Handler:** ❌ **MISSING** - No `dialog:showOpenDialog` handler in main.ts
- **Status:** 🔴 **BROKEN**
- **Error:** Handler not registered
- **Fix Required:** Add IPC handler in main.ts or change to use `fs:selectFolder`

**Current Code:**
```typescript
const handleOpenFolder = async () => {
  try {
    const result = await window.primus.dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    if (result && Array.isArray(result) && result.length > 0) {
      await loadWorkspace(result[0]);
    }
  } catch (err) {
    console.error('Failed to open folder:', err);
  }
};
```

**Available IPC:**
```typescript
ipcMain.handle('fs:selectFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory']
  });
  return result.canceled ? null : result.filePaths[0];
});
```

### 3.2 New File Button (in Explorer view)
- **Element:** 📄 icon button in sidebar header
- **Handler:** None
- **Status:** 🔴 **NOT IMPLEMENTED**
- **Expected:** Create new untitled file in editor

### 3.3 Show AI Chat Button
- **Element:** Button in AI sidebar
- **Handler:** `onClick={() => setIsAIVisible(!isAIVisible)}`
- **Status:** ✅ WORKING
- **Test:** Toggles AI chat overlay
- **Expected:** AI chat panel appears/disappears

---

## 4. File Explorer

### 4.1 File Tree Component
- **Component:** `<FileExplorer rootPath={currentFolder} onFileSelect={openFile} />`
- **Handler:** `onFileSelect` callback
- **IPC:** `window.primus.fs.readDir(path)`
- **Status:** ❌ **NEEDS VERIFICATION**
- **Test:** Click file should open in editor
- **Expected:** File content loads in Monaco editor

### 4.2 Open File Action
- **Handler:** `openFile(filePath: string)`
- **IPC Call:** `window.primus.fs.readFile(filePath)`
- **IPC Handler:** Should exist in main.ts
- **Status:** ⚠️ **UNKNOWN** - Need to verify IPC handler exists
- **Expected:** File opens in new tab with syntax highlighting

---

## 5. Editor Area

### 5.1 Tab Bar

#### 5.1.1 Tab Click (Switch Tab)
- **Handler:** `onClick={() => setActiveTabId(tab.id)}`
- **Status:** ✅ WORKING
- **Test:** Click tab switches active editor
- **Expected:** Tab becomes active, editor shows that file's content

#### 5.1.2 Tab Close Button (✕)
- **Handler:** `onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}`
- **Status:** ✅ WORKING
- **Test:** Click X closes tab
- **Expected:** Tab removed, switches to adjacent tab

#### 5.1.3 Dirty Indicator (•)
- **Element:** Dot appears after filename when modified
- **Status:** ✅ WORKING
- **Test:** Edit file content, dot appears
- **Expected:** Visual indication of unsaved changes

### 5.2 Monaco Editor

#### 5.2.1 Code Editing
- **Component:** `<MonacoEditor />`
- **Handler:** `onChange={(value) => { ... }}`
- **Status:** ✅ WORKING
- **Test:** Type in editor, state updates
- **Expected:** Code edits tracked, marks tab as dirty

#### 5.2.2 Syntax Highlighting
- **Status:** ✅ WORKING
- **Test:** Open .ts, .js, .css files
- **Expected:** Language-specific syntax highlighting

#### 5.2.3 Line Numbers
- **Status:** ✅ WORKING
- **Test:** Check left gutter
- **Expected:** Line numbers visible

#### 5.2.4 Minimap
- **Config:** `minimapEnabled={true}`
- **Status:** ✅ WORKING
- **Test:** Check right side of editor
- **Expected:** Minimap shows code overview

---

## 6. Welcome Screen

### 6.1 Open Folder Button (Primary)
- **Element:** Blue button with 📁 icon
- **Handler:** `onClick={handleOpenFolder}`
- **Status:** 🔴 **BROKEN** (Same IPC issue as sidebar button)
- **Fix:** See Section 3.1

### 6.2 New File Button
- **Element:** Gray button with 📄 icon
- **Handler:** None
- **Status:** 🔴 **NOT IMPLEMENTED**
- **Expected:** Create new untitled file

### 6.3 Keyboard Shortcuts Display
- **Element:** Grid showing Ctrl+P, Ctrl+Shift+P, Ctrl+B, Ctrl+J
- **Status:** ✅ INFORMATIONAL ONLY
- **Test:** Display only, not clickable
- **Expected:** Show available shortcuts

---

## 7. Bottom Panel

### 7.1 Panel Tab Buttons

#### 7.1.1 Problems Tab
- **Handler:** `onClick={() => setActivePanel('problems')}`
- **Status:** ✅ WORKING
- **Test:** Click shows problems panel
- **Expected:** Shows TypeScript/linter errors and warnings

#### 7.1.2 Output Tab
- **Handler:** `onClick={() => setActivePanel('output')}`
- **Status:** ⚠️ PARTIAL - UI works, output not implemented
- **Test:** Click shows "Output panel coming soon..."
- **Expected:** Shows build output, logs

#### 7.1.3 Terminal Tab
- **Handler:** `onClick={() => setActivePanel('terminal')}`
- **Status:** ⚠️ **PARTIAL** - UI works, need to verify terminal commands
- **Test:** Click shows terminal component
- **Expected:** Interactive shell

#### 7.1.4 Debug Console Tab
- **Handler:** `onClick={() => setActivePanel('debug')}`
- **Status:** ⚠️ PARTIAL - UI works, debug not implemented
- **Test:** Click shows "Debug console coming soon..."
- **Expected:** Debug output and REPL

### 7.2 Panel Close Button (✕)
- **Handler:** `onClick={() => setIsPanelVisible(false)}`
- **Status:** ✅ WORKING
- **Test:** Click hides bottom panel
- **Expected:** Panel closes, editor expands

### 7.3 Terminal Component
- **Component:** `<Terminal isVisible={true} onToggle={() => {}} />`
- **Status:** ⚠️ **NEEDS VERIFICATION**
- **IPC:** Terminal commands need IPC to main process
- **Expected:** Execute shell commands, show output

### 7.4 Problems Panel
- **Component:** `<ProblemsPanel />`
- **Handler:** `onSelectProblem={(p) => { if (p.filePath) openFile(p.filePath); }}`
- **Status:** ✅ WORKING
- **Test:** Click problem jumps to file
- **Expected:** Opens file and highlights error line

---

## 8. Status Bar

### 8.1 Folder Name Display
- **Element:** Shows current folder or "No folder open"
- **Status:** ✅ WORKING
- **Test:** Open folder, name appears
- **Expected:** Display workspace folder name

### 8.2 Cursor Position (Ln, Col)
- **Element:** "Ln 1, Col 1"
- **Status:** 🔴 **NOT IMPLEMENTED**
- **Expected:** Update with cursor position in editor

### 8.3 Language Display
- **Element:** Shows file language (e.g., "TYPESCRIPT")
- **Status:** ✅ WORKING
- **Test:** Open file, language appears
- **Expected:** Display language based on file extension

### 8.4 Error/Warning Count
- **Element:** Shows ❌ and ⚠️ counts
- **Status:** ✅ WORKING
- **Test:** Problems shown in status bar
- **Expected:** Click opens problems panel (NOT IMPLEMENTED)

### 8.5 Encoding Display
- **Element:** "UTF-8"
- **Status:** ✅ INFORMATIONAL ONLY
- **Expected:** Display only, changeable in future

### 8.6 Line Ending Display
- **Element:** "LF"
- **Status:** ✅ INFORMATIONAL ONLY
- **Expected:** Display only, changeable in future

---

## 9. Keyboard Shortcuts

| Shortcut | Handler | Status | Expected Behavior |
|----------|---------|--------|-------------------|
| Ctrl+S | `saveFile(activeTabId)` | 🔴 **BROKEN** | Save current file (IPC handler missing) |
| Ctrl+P | None | 🔴 NOT IMPLEMENTED | Open quick file picker |
| Ctrl+B | `setIsSidebarVisible` | ✅ WORKING | Toggle sidebar visibility |
| Ctrl+J | `setIsPanelVisible` | ✅ WORKING | Toggle bottom panel visibility |
| Ctrl+Shift+P | None | 🔴 NOT IMPLEMENTED | Open command palette |
| Ctrl+Shift+E | None | 🔴 NOT IMPLEMENTED | Focus explorer |
| Ctrl+Shift+F | None | 🔴 NOT IMPLEMENTED | Focus search |
| Ctrl+Shift+G | None | 🔴 NOT IMPLEMENTED | Focus git |
| Ctrl+Shift+X | None | 🔴 NOT IMPLEMENTED | Focus extensions |
| Ctrl+Shift+A | None | 🔴 NOT IMPLEMENTED | Focus AI |

---

## 10. AI Integration

### 10.1 AI Chat Panel
- **Component:** `<AIChatPanelWrapper />`
- **Props:** `isVisible`, `currentContext` (file path, content, language)
- **Status:** ⚠️ **NEEDS VERIFICATION**
- **IPC:** `window.primus.ai.request()`
- **Expected:** Send prompts to Mistral AI, receive responses

### 10.2 AI Context Passing
- **Data:** Current file path, content, language, cursor position
- **Status:** ✅ WORKING (data is passed correctly)
- **Expected:** AI has context of current file for better responses

---

## Critical Bugs Summary

### 🔴 Priority 1 - Blocking Basic Functionality

1. **Open Folder Button Broken**
   - **Issue:** IPC handler mismatch
   - **Current:** Calls `window.primus.dialog.showOpenDialog()`
   - **Available:** `fs:selectFolder` handler exists
   - **Fix:** Either add dialog handler or change renderer to use fs:selectFolder

2. **Save File Not Working**
   - **Issue:** Missing IPC handler for `fs:writeFile`
   - **Current:** `saveFile()` calls `window.primus.fs.writeFile()`
   - **Fix:** Add `ipcMain.handle('fs:writeFile', ...)` in main.ts

3. **New File Not Implemented**
   - **Issue:** No handler attached to New File buttons
   - **Fix:** Add handler to create untitled file with empty content

### 🟡 Priority 2 - Enhanced Functionality

4. **Cursor Position Not Updating**
   - **Issue:** Status bar shows static "Ln 1, Col 1"
   - **Fix:** Add Monaco editor cursor change listener

5. **Error Count Not Clickable**
   - **Issue:** Clicking error count doesn't open problems panel
   - **Fix:** Add onClick handler to status bar error count

6. **Menu Items Not Functional**
   - **Issue:** All menu bar items are placeholders
   - **Fix:** Implement dropdown menus with actions

### 🟢 Priority 3 - Future Enhancements

7. **Search Not Implemented**
8. **Git Not Implemented**
9. **Extensions Not Implemented**
10. **Debug Not Implemented**
11. **Output Panel Not Implemented**
12. **Command Palette Not Implemented**

---

## Recommended Fixes (In Order)

### Fix 1: Open Folder Button
```typescript
// Option A: Add dialog handler in main.ts
ipcMain.handle('dialog:showOpenDialog', async (_, options) => {
  const result = await dialog.showOpenDialog(mainWindow!, options);
  return result.canceled ? [] : result.filePaths;
});

// Option B: Change renderer to use existing handler
const handleOpenFolder = async () => {
  const folderPath = await window.primus.fs.selectFolder();
  if (folderPath) {
    await loadWorkspace(folderPath);
  }
};
```

### Fix 2: Save File
```typescript
// Add to main.ts
ipcMain.handle('fs:writeFile', async (_, filePath: string, content: string) => {
  await fs.promises.writeFile(filePath, content, 'utf8');
  return true;
});

// Add to preload.ts
fs: {
  writeFile: (path: string, content: string) => 
    ipcRenderer.invoke('fs:writeFile', path, content),
  // ... other fs methods
}
```

### Fix 3: New File
```typescript
// Add to App.tsx
const handleNewFile = () => {
  const newTab: Tab = {
    id: Date.now().toString(),
    name: 'Untitled-1',
    content: '',
    language: 'plaintext',
    isDirty: false
  };
  setTabs(prev => [...prev, newTab]);
  setActiveTabId(newTab.id);
};

// Update button
<button className="icon-btn" onClick={handleNewFile} title="New File">
  📄
</button>
```

---

## Testing Checklist

- [ ] Open Folder button in sidebar
- [ ] Open Folder button on welcome screen
- [ ] New File button
- [ ] File tree loads after opening folder
- [ ] Click file in tree opens in editor
- [ ] Edit file marks tab as dirty
- [ ] Save file (Ctrl+S) removes dirty indicator
- [ ] Close tab removes it from tab bar
- [ ] Switch tabs changes active editor
- [ ] Theme toggle switches dark/light
- [ ] Activity bar icons change sidebar content
- [ ] Bottom panel tabs switch content
- [ ] Panel close button hides panel
- [ ] Ctrl+B toggles sidebar
- [ ] Ctrl+J toggles panel
- [ ] Problems panel shows errors
- [ ] Click problem opens file
- [ ] Terminal executes commands
- [ ] AI chat sends/receives messages
- [ ] Monaco syntax highlighting works
- [ ] Monaco minimap displays
- [ ] Status bar shows correct info

---

**End of Audit Report**
