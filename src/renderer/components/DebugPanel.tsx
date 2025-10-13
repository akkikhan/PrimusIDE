// src/renderer/components/DebugPanel.tsx
import React, { useState, useEffect } from 'react';
import '../styles/DebugPanel.css';

const DebugPanel: React.FC = () => {
  const [output, setOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [programPath, setProgramPath] = useState<string | null>(null);
  const [stack, setStack] = useState<any[]>([]);
  const [variables, setVariables] = useState<{ frameId: number; variables: any[] } | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!window.electron || !window.electron.receive) {
      console.warn('Electron IPC not available - debug panel will have limited functionality');
      return;
    }

    window.electron.receive('debug:output', (category: string, data: string) => {
      setOutput(prev => [...prev, `[${category}] ${data}`]);
    });

    window.electron.receive('debug:stopped', (data: any) => {
      setOutput(prev => [...prev, `Stopped: ${JSON.stringify(data)}`]);
      setIsPaused(true);
    });

    window.electron.receive('debug:terminated', () => {
      setOutput(prev => [...prev, 'Debugger terminated.']);
      setIsRunning(false);
      setIsPaused(false);
      setStack([]);
      setVariables(null);
    });

    window.electron.receive('debug:stack', (frames: any[]) => {
      setStack(frames);
    });

    window.electron.receive('debug:variables', (payload: { frameId: number; variables: any[] }) => {
      setVariables(payload);
    });
  }, []);

  const handleSelectFile = async () => {
    const path = await window.electron.invoke('fs:selectFile');
    if (path) {
      setProgramPath(path);
    }
  };

  const handleStartDebugging = () => {
    if (!programPath) return;
    window.electron.send('debug:start', programPath);
    setIsRunning(true);
    setOutput([`Debugger started for ${programPath}...`]);
  };

  const handleStopDebugging = () => {
    window.electron.send('debug:stop', null);
  };

  const handleContinue = () => {
    window.electron.send('debug:continue', null);
    setIsPaused(false);
  };

  const handleStepOver = () => {
    window.electron.send('debug:stepOver', null);
    setIsPaused(false);
  };

  const handleStepIn = () => {
    window.electron.send('debug:stepIn', null);
    setIsPaused(false);
  };

  const handleStepOut = () => {
    window.electron.send('debug:stepOut', null);
    setIsPaused(false);
  };

  return (
    <div className="debug-panel">
      <div className="debug-controls">
        <button onClick={handleSelectFile} disabled={isRunning}>Select File</button>
        <button onClick={handleStartDebugging} disabled={isRunning || !programPath}>Start</button>
        <button onClick={handleStopDebugging} disabled={!isRunning}>Stop</button>
        <button onClick={handleContinue} disabled={!isRunning || !isPaused}>Continue</button>
        <button onClick={handleStepOver} disabled={!isRunning || !isPaused}>Step Over</button>
        <button onClick={handleStepIn} disabled={!isRunning || !isPaused}>Step In</button>
        <button onClick={handleStepOut} disabled={!isRunning || !isPaused}>Step Out</button>
        {isPaused && <span className="paused-indicator">Paused</span>}
      </div>
      {programPath && <div className="selected-file">File: {programPath}</div>}
      <div className="debug-output">
        {output.map((line, index) => (
          <div key={index}>{line}</div>
        ))}
      </div>
      <div className="debug-stack">
        <h4>Call Stack</h4>
        {stack.map((f, i) => (
          <div key={i}>{f.name} - {f.source}:{f.line}</div>
        ))}
      </div>
      <div className="debug-variables">
        <h4>Variables</h4>
        {variables?.variables.map((v, i) => (
          <div key={i}>{v.name}: {v.value}</div>
        ))}
      </div>
    </div>
  );
};

export default DebugPanel;
