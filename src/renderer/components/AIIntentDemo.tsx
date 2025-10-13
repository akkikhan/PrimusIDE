/**
 * AI Intent Demo - Showcase Component
 * Demonstrates the full capabilities of the AI Intent Interface
 */

import React from 'react';
import { Play, Mic, Brain, Code, GitCompare, RefreshCw, Eye, Zap } from 'lucide-react';
import './AIIntentDemo.css';

export const AIIntentDemo: React.FC = () => {
  const demoCommands = [
    {
      category: "Editor Control",
      icon: <Code size={16} />,
      commands: [
        { text: "split view", description: "Divide editor into two panes" },
        { text: "change layout to vertical", description: "Switch to vertical split" },
        { text: "sync editors", description: "Synchronize scrolling between panes" },
        { text: "merge view", description: "Combine split panes back to single" }
      ]
    },
    {
      category: "File Operations", 
      icon: <Eye size={16} />,
      commands: [
        { text: "open file example.js", description: "Open a specific file" },
        { text: "create new file", description: "Create a new empty file" },
        { text: "save file", description: "Save the current file" },
        { text: "compare files", description: "Show differences between files" }
      ]
    },
    {
      category: "AI Analysis",
      icon: <Brain size={16} />,
      commands: [
        { text: "analyze this code", description: "Perform AI code analysis" },
        { text: "suggest improvements", description: "Get AI optimization suggestions" },
        { text: "find bugs", description: "Detect potential issues in code" },
        { text: "explain code", description: "Get AI explanation of code logic" }
      ]
    },
    {
      category: "Navigation",
      icon: <RefreshCw size={16} />,
      commands: [
        { text: "go to line 42", description: "Jump to specific line number" },
        { text: "find function main", description: "Locate a specific function" },
        { text: "search for console", description: "Search for text in file" }
      ]
    },
    {
      category: "Code Formatting",
      icon: <GitCompare size={16} />,
      commands: [
        { text: "format code", description: "Beautify and format the code" },
        { text: "refactor code", description: "Get refactoring suggestions" },
        { text: "add comments", description: "Generate code comments" }
      ]
    }
  ];

  return (
    <div className="ai-demo-container">
      <div className="ai-demo-header">
        <div className="ai-demo-title">
          <Brain size={24} />
          <h2>AI Intent Interface Demo</h2>
        </div>
        <div className="ai-demo-subtitle">
          Try these voice commands or type them in the AI Command Interface
        </div>
      </div>

      <div className="ai-demo-features">
        <div className="demo-feature">
          <Mic size={20} />
          <div>
            <h3>Voice Recognition</h3>
            <p>Speak naturally to control the editor</p>
          </div>
        </div>
        <div className="demo-feature">
          <Brain size={20} />
          <div>
            <h3>AI-Powered</h3>
            <p>Intelligent command understanding</p>
          </div>
        </div>
        <div className="demo-feature">
          <Zap size={20} />
          <div>
            <h3>Real-time</h3>
            <p>Instant command execution</p>
          </div>
        </div>
      </div>

      <div className="ai-demo-commands">
        {demoCommands.map((category, index) => (
          <div key={index} className="command-category">
            <div className="category-header">
              {category.icon}
              <h3>{category.category}</h3>
            </div>
            <div className="category-commands">
              {category.commands.map((command, cmdIndex) => (
                <div key={cmdIndex} className="demo-command">
                  <div className="command-text">
                    <Play size={12} />
                    <code>"{command.text}"</code>
                  </div>
                  <div className="command-description">
                    {command.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="ai-demo-usage">
        <h3>How to Use</h3>
        <ol>
          <li>Look for the <Brain size={16} /> AI Command Interface in the top-right corner</li>
          <li>Click the <Mic size={16} /> microphone button to start voice input</li>
          <li>Speak any command naturally (e.g., "split view", "analyze code")</li>
          <li>Or type your command directly in the input field</li>
          <li>The AI will understand your intent and execute the action</li>
        </ol>
      </div>
    </div>
  );
};

export default AIIntentDemo;
