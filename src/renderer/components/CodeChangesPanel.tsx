import React, { useState, useEffect } from 'react';
import { CodeChange, codeApplicationManager, CodeApplicationResult } from '../codeApplication/CodeApplicationManager';
import CodeDiffViewer from './CodeDiffViewer';
import '../styles/CodeChangesPanel.css';

export const CodeChangesPanel: React.FC = () => {
  const [pendingChanges, setPendingChanges] = useState<CodeChange[]>([]);
  const [appliedChanges, setAppliedChanges] = useState<CodeChange[]>([]);
  const [selectedChangeId, setSelectedChangeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'applied'>('pending');
  const [showBatchActions, setShowBatchActions] = useState(false);
  const [selectedChanges, setSelectedChanges] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadChanges();
    
    // Listen for change events
    const handleChangeCreated = (change: CodeChange) => {
      setPendingChanges(prev => [...prev, change]);
    };
    
    const handleChangeApplied = (change: CodeChange) => {
      setPendingChanges(prev => prev.filter(c => c.id !== change.id));
      setAppliedChanges(prev => [...prev, change]);
    };
    
    const handleChangeRolledBack = (change: CodeChange) => {
      setAppliedChanges(prev => prev.filter(c => c.id !== change.id));
      setPendingChanges(prev => [...prev, change]);
    };
    
    const handleChangeDeleted = (changeId: string) => {
      setPendingChanges(prev => prev.filter(c => c.id !== changeId));
      setSelectedChanges(prev => {
        const newSet = new Set(prev);
        newSet.delete(changeId);
        return newSet;
      });
    };
    
    const handleAllChangesCleared = () => {
      setPendingChanges([]);
      setSelectedChanges(new Set());
    };
    
    codeApplicationManager.on('changeCreated', handleChangeCreated);
    codeApplicationManager.on('changeApplied', handleChangeApplied);
    codeApplicationManager.on('changeRolledBack', handleChangeRolledBack);
    codeApplicationManager.on('changeDeleted', handleChangeDeleted);
    codeApplicationManager.on('allChangesCleared', handleAllChangesCleared);
    
    return () => {
      codeApplicationManager.off('changeCreated', handleChangeCreated);
      codeApplicationManager.off('changeApplied', handleChangeApplied);
      codeApplicationManager.off('changeRolledBack', handleChangeRolledBack);
      codeApplicationManager.off('changeDeleted', handleChangeDeleted);
      codeApplicationManager.off('allChangesCleared', handleAllChangesCleared);
    };
  }, []);

  const loadChanges = () => {
    setPendingChanges(codeApplicationManager.getPendingChanges());
    setAppliedChanges(codeApplicationManager.getAppliedChanges());
  };

  const handleApplyChange = async (changeId: string) => {
    setIsProcessing(true);
    try {
      const result = await codeApplicationManager.applyChange(changeId);
      if (result.success) {
        
      } else {
        console.error('Failed to apply change:', result.message);
        // Handle conflicts or errors
      }
    } catch (error) {
      console.error('Error applying change:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectChange = (changeId: string) => {
    codeApplicationManager.deleteChange(changeId);
  };

  const handleRollbackChange = async (changeId: string) => {
    setIsProcessing(true);
    try {
      const results = await codeApplicationManager.rollbackToChange(changeId);
      const success = results.every(r => r.success);
      if (success) {
        
      } else {
        console.error('Rollback failed:', results);
      }
    } catch (error) {
      console.error('Error during rollback:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectChange = (changeId: string, selected: boolean) => {
    setSelectedChanges(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(changeId);
      } else {
        newSet.delete(changeId);
      }
      return newSet;
    });
  };

  const handleApplyBatch = async () => {
    if (selectedChanges.size === 0) return;
    
    setIsProcessing(true);
    try {
      const results = await codeApplicationManager.applyBatchChanges(
        Array.from(selectedChanges)
      );
      
      const successCount = results.filter(r => r.success).length;
      
      setSelectedChanges(new Set());
    } catch (error) {
      console.error('Error applying batch changes:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectBatch = () => {
    selectedChanges.forEach(changeId => {
      codeApplicationManager.deleteChange(changeId);
    });
    setSelectedChanges(new Set());
  };

  const renderChangeItem = (change: CodeChange, isApplied: boolean = false) => {
    const isSelected = selectedChanges.has(change.id);
    
    return (
      <div 
        key={change.id} 
        className={`change-item ${selectedChangeId === change.id ? 'active' : ''} ${isSelected ? 'selected' : ''}`}
        onClick={() => setSelectedChangeId(change.id)}
      >
        <div className="change-header">
          <div className="change-checkbox">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                handleSelectChange(change.id, e.target.checked);
              }}
              aria-label={`Select change: ${change.description}`}
            />
          </div>
          
          <div className="change-info">
            <div className="change-title">{change.description}</div>
            <div className="change-meta">
              <span className="change-type">{change.changeType}</span>
              <span className="file-name">{change.filePath.split('/').pop()}</span>
              <span className="line-range">L{change.lineStart}-{change.lineEnd}</span>
              {change.aiProvider && (
                <span className="ai-provider">{change.aiProvider}</span>
              )}
            </div>
          </div>
          
          <div className="change-timestamp">
            {change.timestamp.toLocaleTimeString()}
          </div>
        </div>
        
        {!isApplied && (
          <div className="change-actions">
            <button 
              className="btn-small btn-reject" 
              onClick={(e) => {
                e.stopPropagation();
                handleRejectChange(change.id);
              }}
            >
              Reject
            </button>
            <button 
              className="btn-small btn-apply" 
              onClick={(e) => {
                e.stopPropagation();
                handleApplyChange(change.id);
              }}
              disabled={isProcessing}
            >
              Apply
            </button>
          </div>
        )}
        
        {isApplied && (
          <div className="change-actions">
            <button 
              className="btn-small btn-rollback" 
              onClick={(e) => {
                e.stopPropagation();
                handleRollbackChange(change.id);
              }}
              disabled={isProcessing}
            >
              Rollback
            </button>
          </div>
        )}
      </div>
    );
  };

  const currentChanges = activeTab === 'pending' ? pendingChanges : appliedChanges;

  return (
    <div className="code-changes-panel">
      <div className="changes-header">
        <div className="tab-navigation">
          <button 
            className={activeTab === 'pending' ? 'active' : ''}
            onClick={() => setActiveTab('pending')}
          >
            Pending ({pendingChanges.length})
          </button>
          <button 
            className={activeTab === 'applied' ? 'active' : ''}
            onClick={() => setActiveTab('applied')}
          >
            Applied ({appliedChanges.length})
          </button>
        </div>
        
        {activeTab === 'pending' && pendingChanges.length > 0 && (
          <div className="batch-controls">
            <button
              className="btn-small"
              onClick={() => setShowBatchActions(!showBatchActions)}
            >
              Batch Actions
            </button>
            
            {showBatchActions && selectedChanges.size > 0 && (
              <div className="batch-actions">
                <button 
                  className="btn-small btn-reject" 
                  onClick={handleRejectBatch}
                >
                  Reject Selected ({selectedChanges.size})
                </button>
                <button 
                  className="btn-small btn-apply" 
                  onClick={handleApplyBatch}
                  disabled={isProcessing}
                >
                  Apply Selected ({selectedChanges.size})
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="changes-content">
        <div className="changes-list">
          {currentChanges.length === 0 ? (
            <div className="no-changes">
              <span>No {activeTab} changes</span>
            </div>
          ) : (
            currentChanges.map(change => 
              renderChangeItem(change, activeTab === 'applied')
            )
          )}
        </div>
        
        {selectedChangeId && (
          <div className="change-preview">
            <CodeDiffViewer
              changeId={selectedChangeId}
              onApply={handleApplyChange}
              onReject={handleRejectChange}
              showActions={activeTab === 'pending'}
            />
          </div>
        )}
      </div>
      
      {activeTab === 'applied' && appliedChanges.length > 0 && (
        <div className="rollback-controls">
          <button 
            className="btn-rollback" 
            onClick={() => codeApplicationManager.rollbackLastChange()}
            disabled={isProcessing}
          >
            Rollback Last Change
          </button>
        </div>
      )}
    </div>
  );
};

export default CodeChangesPanel;
