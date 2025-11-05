import React, { useEffect, useRef, useState, useCallback } from "react";
import type { AICommandSuggestion } from "./services/AdvancedTerminalService";

interface TerminalProps {
  isVisible: boolean;
  onToggle: () => void;
}

type TerminalBridge = {
  executeCommand: (command: string) => Promise<{ output?: string; error?: string }>;
  getCurrentDir: () => Promise<string>;
  getSuggestions?: (context: { input: string }) => Promise<AICommandSuggestion[]>;
};

const getTerminalBridge = (): TerminalBridge | null => {
  if (typeof window === "undefined") {
    return null;
  }

  return (window.primus?.terminal as unknown as TerminalBridge) ?? null;
};

const Terminal: React.FC<TerminalProps> = ({ isVisible, onToggle }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [output, setOutput] = useState<string[]>(["Welcome to Primus IDE Terminal"]);
  const [aiSuggestions, setAISuggestions] = useState<AICommandSuggestion[]>([]);
  const [currentDir, setCurrentDir] = useState<string>("");
  const [inputValue, setInputValue] = useState<string>("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const bridge = getTerminalBridge();
    if (bridge) {
      bridge.getCurrentDir().then(setCurrentDir).catch(() => setCurrentDir(""));
    }
  }, [isVisible]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible]);

  const refreshSuggestions = useCallback(async (input: string) => {
    const bridge = getTerminalBridge();
    if (!bridge?.getSuggestions) {
      setAISuggestions([]);
      return;
    }

    if (!input.trim()) {
      setAISuggestions([]);
      return;
    }

    try {
      const suggestions = await bridge.getSuggestions({ input });
      setAISuggestions(suggestions ?? []);
    } catch {
      setAISuggestions([]);
    }
  }, []);

  const handleBasicCommand = useCallback((command: string) => {
    const normalized = command.toLowerCase().trim();

    if (normalized === "clear" || normalized === "cls") {
      setOutput(["Welcome to Primus IDE Terminal"]);
      return;
    }

    if (normalized === "help") {
      setOutput(prev => [
        ...prev,
        "Available commands:",
        "  help - Show this help",
        "  clear/cls - Clear terminal",
        "  pwd - Show current directory",
        "  echo <text> - Echo text"
      ]);
      return;
    }

    if (normalized === "pwd") {
      setOutput(prev => [...prev, currentDir || '/']);
      return;
    }

    if (normalized.startsWith("echo ")) {
      const text = command.slice(5);
      setOutput(prev => [...prev, text]);
      return;
    }

    setOutput(prev => [...prev, `Command not found: ${command}`]);
  }, [currentDir]);

  const executeCommand = useCallback(async (command: string) => {
    if (!command.trim()) {
      return;
    }

    setCommandHistory(prev => [...prev, command]);
    setHistoryIndex(-1);
    setOutput(prev => [...prev, `> ${command}`]);

    const bridge = getTerminalBridge();

    try {
      if (bridge) {
        const rawResult = await bridge.executeCommand(command);
        const result = typeof rawResult === 'string' ? { output: rawResult } : rawResult ?? {};

        if (command.startsWith("cd ") || command === "cd") {
          const newDir = await bridge.getCurrentDir();
          setCurrentDir(newDir);
        }

        if (result.output) {
          const lines = result.output.split("\n").filter(line => line.trim().length > 0);
          setOutput(prev => [...prev, ...lines]);
        }

        if (result.error) {
          const lines = result.error.split("\n").filter(line => line.trim().length > 0);
          setOutput(prev => [...prev, ...lines.map(line => `Error: ${line}`)]);
        }
      } else {
        handleBasicCommand(command);
      }
    } catch (error) {
      setOutput(prev => [...prev, `Error: ${error instanceof Error ? error.message : String(error)}`]);
    }

    setInputValue("");
    setAISuggestions([]);
  }, [handleBasicCommand]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      executeCommand(inputValue);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHistoryIndex(prevIndex => {
        const nextIndex = prevIndex === -1 ? commandHistory.length - 1 : Math.max(0, prevIndex - 1);
        if (nextIndex >= 0 && commandHistory[nextIndex]) {
          setInputValue(commandHistory[nextIndex]);
        }
        return nextIndex;
      });
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHistoryIndex(prevIndex => {
        if (prevIndex === -1) {
          return -1;
        }

        const nextIndex = prevIndex + 1;
        if (nextIndex >= commandHistory.length) {
          setInputValue("");
          return -1;
        }

        setInputValue(commandHistory[nextIndex]);
        return nextIndex;
      });
    }
  }, [commandHistory, executeCommand, inputValue]);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setInputValue(value);
    refreshSuggestions(value);
  }, [refreshSuggestions]);

  const clearTerminal = useCallback(() => {
    setOutput(["Welcome to Primus IDE Terminal"]);
    setAISuggestions([]);
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="terminal-container">
      <div className="terminal-header">
        <span className="terminal-title">Terminal</span>
        <div className="terminal-controls">
          <button className="terminal-btn" onClick={clearTerminal} title="Clear Terminal" type="button">
            Clear
          </button>
          <button className="terminal-btn close-btn" onClick={onToggle} title="Close Terminal" type="button">
            x
          </button>
        </div>
      </div>
      <div className="terminal-content" ref={terminalRef}>
        {output.map((line, index) => (
          <div key={`${line}-${index}`} className="terminal-line">
            {line}
          </div>
        ))}
        {aiSuggestions.length > 0 && (
          <div className="terminal-ai-suggestions">
            <div className="terminal-ai-title">AI Suggestions</div>
            <ul>
              {aiSuggestions.slice(0, 3).map((suggestion, index) => (
                <li key={`${suggestion.command}-${index}`}>
                  <button
                    type="button"
                    className="terminal-suggestion"
                    onClick={() => setInputValue(suggestion.command)}
                    title={suggestion.explanation}
                  >
                    {suggestion.command}
                    <span className="confidence">{`${Math.round((suggestion.confidence ?? 0) * 100)}%`}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="terminal-input-line">
          <span className="terminal-prompt">
            {currentDir ? `${currentDir.split("\\").pop() ?? ""} > ` : "> "}
          </span>
          <input
            ref={inputRef}
            type="text"
            className="terminal-input"
            value={inputValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Type command..."
          />
        </div>
      </div>
    </div>
  );
};

export default Terminal;
