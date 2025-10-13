import React, { useEffect, useState } from 'react';
import { aiServiceManager } from './ai/SafeAIServiceManager';
import './styles/ai-initializer.css';

interface AIInitializerProps {
  children: React.ReactNode;
}

export const AIInitializer: React.FC<AIInitializerProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const initializeAI = async () => {
      try {
        await aiServiceManager.initialize();
        const status = aiServiceManager.getStatus();
        
        if (status.usingMock) {
          console.warn('[AI] Using mock AI service - some features may be limited');
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('[AI] Failed to initialize AI services:', error);
        setInitError(error instanceof Error ? error.message : String(error));
        setIsInitialized(true); // Continue anyway with fallback
      }
    };

    initializeAI();
  }, []);

  if (!isInitialized) {
    return (
      <div className="ai-initializer">
        <div className="ai-initializer-content">
          <h2>🤖 Initializing Primus IDE</h2>
          <p>Loading AI services<span className="loading-dots"></span></p>
          {initError && (
            <div className="error">
              <small>Warning: {initError}</small>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};