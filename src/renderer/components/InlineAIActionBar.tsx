import React from 'react';

interface InlineAIActionBarProps {
  visible: boolean;
  top: number;
  left: number;
  onExplain: () => void;
  // Future: onRefactor, onGenerateTests, onApplyDiff etc.
}

/**
 * Minimal inline AI action bar shown near current Monaco selection.
 * Initial vertical slice: single Explain button.
 */
export const InlineAIActionBar: React.FC<InlineAIActionBarProps> = ({ visible, top, left, onExplain }) => {
  if (!visible) return null;
  return (
    <div className="inline-ai-action-bar" style={{ top, left }}>
      <button className="ai-action-btn" onClick={onExplain} title="Explain selected code">Explain</button>
      {/* Future buttons: Refactor, Tests, Diff */}
      {/**
       * TODO (Inline AI Roadmap):
       * - Add Refactor button mapping to operation 'refactor' with structured intent gathering.
       * - Add Tests button generating unit test skeletons (operation 'tests').
       * - Add Diff button to request transformation and preview patch before applying.
       * - Add pin / detach behavior & keyboard shortcut (e.g. Alt+I to focus action bar).
       * - Introduce small loading spinner state on buttons during in-flight request.
       */}
    </div>
  );
};

export default InlineAIActionBar;
