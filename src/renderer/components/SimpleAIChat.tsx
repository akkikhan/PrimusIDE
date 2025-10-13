import React, { useState, useRef, useEffect } from 'react';

interface SimpleAIChatProps {
  isVisible: boolean;
  onToggle: () => void;
  currentContext?: {
    filePath: string;
    content: string;
    language: string;
    cursorPosition: { line: number; column: number };
    selection?: any;
  };
}

export const SimpleAIChat: React.FC<SimpleAIChatProps> = ({ isVisible, onToggle, currentContext }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Array<{ id: string; role: 'user'|'assistant'; content: string; ts: number }>>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  if (!isVisible) return null;

  const send = () => {
    const text = input.trim();
    if (!text) return;
    const id = Date.now().toString();
    setMessages(prev => [...prev, { id, role: 'user', content: text, ts: Date.now() }]);
    setInput('');
    // Minimal local echo to avoid AI dependencies
    setTimeout(() => {
      const ctxHint = currentContext ? `\n\n(ctx: ${currentContext.filePath.split(/[/\\]/).pop()} · ${currentContext.language})` : '';
      setMessages(prev => [...prev, { id: id+':a', role: 'assistant', content: `Stub response for: "${text}"${ctxHint}` , ts: Date.now() }]);
    }, 200);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); }
  };

  return (
    <div className="ai-chat-overlay">
      <div className="ai-chat-header">
        <h3>🤖 AI Chat (stub)</h3>
        <div className="header-actions">
          <button onClick={onToggle} className="close-button">×</button>
        </div>
      </div>
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="empty-state">
            <div className="welcome-message">
              <h3>Welcome</h3>
              <p>This is a lightweight placeholder chat to unblock builds.</p>
            </div>
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} className={`message ${m.role}`}>
            <div className="message-content">{m.content}</div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="chat-input-container">
        <div className="input-wrapper">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a message… (Ctrl/Cmd+Enter to send)"
            rows={2}
          />
          <button onClick={send} disabled={!input.trim()} className="send-button">Send</button>
        </div>
      </div>
    </div>
  );
};
