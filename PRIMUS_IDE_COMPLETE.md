# 🚀 Primus IDE - Professional Development Environment

<div align="center">

![Primus IDE Logo](https://img.shields.io/badge/Primus-IDE-blue?style=for-the-badge&logo=visual-studio-code)

**A modern, feature-rich Integrated Development Environment built with Electron, React, and TypeScript**

[![Version](https://img.shields.io/badge/version-0.1.0-green.svg)](./package.json)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Electron](https://img.shields.io/badge/Electron-30.0.0-47848f.svg)](https://electronjs.org/)
[![React](https://img.shields.io/badge/React-18.2.0-61dafb.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.4-3178c6.svg)](https://www.typescriptlang.org/)

[Features](#features) • [Installation](#installation) • [Usage](#usage) • [Development](#development)

</div>

## 🌟 Overview

Primus IDE is a **professional-grade Integrated Development Environment** designed for modern developers. Built with cutting-edge web technologies, it provides a seamless coding experience with powerful features like intelligent code completion, integrated terminal, extensible plugin system, and customizable themes.

### ✨ Current Status: **FULLY FUNCTIONAL** ✅

The IDE is **complete and operational** with all major features implemented:

- ✅ Monaco Editor with syntax highlighting
- ✅ Integrated terminal (xterm.js)  
- ✅ File explorer with tree navigation
- ✅ Advanced search and replace functionality
- ✅ Comprehensive settings panel
- ✅ Plugin system architecture
- ✅ Keyboard shortcuts system
- ✅ Status bar with real-time information
- ✅ Native menu system
- ✅ Hot-reload development environment

## 🚀 Quick Launch

**The IDE is ready to use right now!** 

```bash
# 1. Install dependencies (if not already done)
npm install

# 2. Launch the IDE
npm run dev:electron
```

The Electron application will start and you'll have a **fully functional professional IDE** with:

- Code editor with IntelliSense
- Integrated terminal
- File management
- Search capabilities
- Settings customization

## ✨ Key Features

### 🎯 Professional Code Editor

- **Monaco Editor** - The same editor that powers VS Code
- **50+ Languages** - Syntax highlighting for TypeScript, JavaScript, CSS, HTML, Python, and more
- **IntelliSense** - Intelligent code completion and suggestions
- **Error Detection** - Real-time syntax and semantic error highlighting
- **Multiple Cursors** - Advanced text editing capabilities

### 🖥️ Integrated Development Tools

- **Built-in Terminal** - Full xterm.js terminal with multiple shell support
- **File Explorer** - Hierarchical file tree with drag-drop functionality
- **Advanced Search** - Project-wide search with regex support
- **Plugin System** - Extensible architecture for custom functionality
- **Settings Panel** - Comprehensive configuration options
- **Keyboard Shortcuts** - Fully customizable keybindings

### 🎨 Modern Interface

- **Dark/Light Themes** - Beautiful, customizable themes
- **Responsive Layout** - Resizable panels and flexible workspace
- **Status Bar** - Real-time information display
- **Native Menus** - Standard desktop application menus
- **Accessibility** - Full keyboard navigation and screen reader support

## 📁 Demo Files Included

The project includes **comprehensive demo files** showcasing the IDE's capabilities:

### `demo.ts` - TypeScript Showcase

- Modern TypeScript features (interfaces, generics, async/await)
- JSDoc documentation examples
- Error handling patterns
- Class definitions with private fields

### `demo.js` - JavaScript Showcase  

- ES6+ syntax and features
- Modern class definitions
- Async/await and Promise handling
- Event-driven architecture patterns

### `demo.css` - CSS Showcase

- CSS variables and custom properties
- Modern layout (Grid, Flexbox)
- Responsive design patterns
- Animation and transition effects
- Dark mode support

### `demo.html` - HTML Showcase

- Semantic HTML5 structure
- Accessibility features (ARIA labels, roles)
- Progressive enhancement
- Modern web standards

## 🛠️ Architecture & Technology

### Core Technology Stack

- **Electron 30.0.0** - Cross-platform desktop framework
- **React 18.2.0** - Modern UI library with hooks
- **TypeScript 5.5.4** - Type-safe development
- **Monaco Editor 0.53.0** - Professional code editor
- **xterm.js** - Terminal emulation
- **Webpack 5** - Module bundling with hot reload

### Project Structure
```
primus-ide/
├── src/
│   ├── main/              # Electron main process
│   │   ├── main.ts        # Application entry point
│   │   ├── menu.ts        # Native menu system
│   │   └── ipc/           # Inter-process communication
│   ├── renderer/          # React renderer process  
│   │   ├── components/    # UI components
│   │   │   ├── Editor/    # Monaco editor integration
│   │   │   ├── Terminal/  # xterm.js terminal
│   │   │   ├── FileExplorer/
│   │   │   ├── SearchPanel/
│   │   │   ├── SettingsPanel/
│   │   │   └── PluginSystem/
│   │   ├── hooks/         # Custom React hooks
│   │   ├── utils/         # Utility functions
│   │   └── App.tsx        # Main application component
│   └── shared/            # Shared utilities and types
├── webpack/               # Build configuration
├── dist/                  # Compiled application
└── demo files/            # Demonstration content
```

## ⌨️ Keyboard Shortcuts

### File Operations

- `Ctrl+N` - New File
- `Ctrl+O` - Open File
- `Ctrl+S` - Save File
- `Ctrl+Shift+S` - Save All Files
- `Ctrl+W` - Close File

### Editor Operations

- `Ctrl+F` - Find in File
- `Ctrl+H` - Replace in File
- `Ctrl+Shift+F` - Find in Files
- `Ctrl+G` - Go to Line
- `Ctrl+/` - Toggle Comment

### View & Navigation

- `Ctrl+B` - Toggle File Explorer
- `Ctrl+`` - Toggle Terminal
- `Ctrl+Shift+P` - Command Palette
- `Ctrl+,` - Open Settings
- `F11` - Toggle Fullscreen

### Terminal

- `Ctrl+Shift+`` - New Terminal
- `Ctrl+C` - Copy (in terminal)
- `Ctrl+V` - Paste (in terminal)
- `Ctrl+K` - Clear Terminal

## 🔧 Development & Building

### Development Mode
```bash
# Start development environment with hot reload
npm run dev:electron

# Start individual components
npm run dev:main      # Main process only
npm run dev:renderer  # Renderer process only
```

### Production Build
```bash
# Build entire application
npm run build

# Build specific components  
npm run build:main
npm run build:renderer

# Start production build
npm start
```

### Available Scripts

- `npm run dev:electron` - Start complete development environment
- `npm run build` - Build production application
- `npm run lint` - Run ESLint code analysis
- `npm run type-check` - TypeScript compilation check
- `npm test` - Run test suite

## 🔌 Plugin System

The IDE includes a **flexible plugin architecture** that allows extending functionality:

### Plugin Structure
```typescript
interface Plugin {
  name: string;
  version: string;
  activate(context: PluginContext): void;
  deactivate?(): void;
}
```

### Built-in Plugins

- **Theme Manager** - Custom theme loading
- **Language Services** - TypeScript/JavaScript support  
- **File Associations** - Custom file type handling
- **Snippet Manager** - Code snippet system

## ⚙️ Configuration

### Settings Location

- **Windows**: `%APPDATA%/primus-ide/settings.json`
- **macOS**: `~/Library/Application Support/primus-ide/settings.json`
- **Linux**: `~/.config/primus-ide/settings.json`

### Key Settings
```json
{
  "editor": {
    "fontSize": 14,
    "fontFamily": "Consolas, Monaco, monospace",
    "theme": "dark",
    "tabSize": 2,
    "wordWrap": "on"
  },
  "terminal": {
    "shell": "powershell",
    "fontSize": 12
  },
  "files": {
    "autoSave": "afterDelay"
  }
}
```

## 🚀 Getting Started Guide

### 1. Installation
```bash
git clone https://github.com/your-username/primus-ide.git
cd primus-ide
npm install
```

### 2. Launch IDE
```bash
npm run dev:electron
```

### 3. Open a Project

- Use `File > Open Folder` or `Ctrl+O`
- Drag and drop a folder into the IDE
- Use the integrated terminal to navigate

### 4. Start Coding

- Create new files with `Ctrl+N`
- Enjoy IntelliSense and syntax highlighting
- Use the integrated terminal for running commands
- Customize settings with `Ctrl+,`

## 🎯 Use Cases

**Perfect for:**

- **Web Development** - React, Angular, Vue.js projects
- **Node.js Applications** - Server-side JavaScript development
- **TypeScript Projects** - Full TypeScript support with type checking
- **Python Development** - Syntax highlighting and basic support
- **General Text Editing** - Markdown, JSON, configuration files
- **Learning & Education** - Clean interface for coding tutorials

## 📊 Performance

- **Fast Startup** - Optimized Electron application
- **Low Memory Usage** - Efficient React components
- **Responsive UI** - 60fps interface with smooth animations
- **Quick File Operations** - Fast file system integration
- **Scalable Architecture** - Handles large codebases efficiently

## 🔄 Recent Updates

### Version 0.1.0 (Current)

- ✅ Complete IDE implementation
- ✅ All major features functional
- ✅ Monaco Editor integration
- ✅ Terminal integration  
- ✅ Plugin system architecture
- ✅ Comprehensive demo files
- ✅ Hot-reload development environment
- ✅ Production build system

## 🤝 Contributing

We welcome contributions! Here's how to get involved:

### Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/primus-ide.git`
3. Install dependencies: `npm install`
4. Start development: `npm run dev:electron`
5. Make your changes
6. Submit a pull request

### Code Guidelines

- Use TypeScript for all new code
- Follow existing code style and conventions
- Add JSDoc comments for public APIs
- Write tests for new functionality
- Update documentation as needed

## 📞 Support & Community

- 🐛 **Issues**: [GitHub Issues](https://github.com/your-username/primus-ide/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/your-username/primus-ide/discussions)  
- 📧 **Email**: support@primus-ide.com
- 📖 **Documentation**: Full docs coming soon

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Special thanks to the open-source projects that make Primus IDE possible:

- **Monaco Editor** - Microsoft's VS Code editor core
- **Electron** - Cross-platform desktop applications
- **React** - UI library for modern interfaces
- **xterm.js** - Terminal emulation in the browser
- **TypeScript** - Type-safe JavaScript development

---

<div align="center">

### 🎉 **Ready to Code?**

**Launch Primus IDE now and experience professional development!**

```bash
npm run dev:electron
```

**Made with ❤️ by developers, for developers**

⭐ **Star us on GitHub** if Primus IDE enhances your coding experience!

</div>
