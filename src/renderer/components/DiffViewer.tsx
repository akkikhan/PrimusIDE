// src/renderer/components/DiffViewer.tsx
import React from 'react';
import { diffChars } from 'diff';

interface DiffViewerProps {
  oldContent: string;
  newContent: string;
}

const DiffViewer: React.FC<DiffViewerProps> = ({ oldContent, newContent }) => {
  const diff = diffChars(oldContent, newContent);

  return (
    <pre className="diff-viewer">
      {diff.map((part, index) => {
        const color = part.added ? 'green' : part.removed ? 'red' : 'grey';
        return (
          <span key={index} style={{ color }}>
            {part.value}
          </span>
        );
      })}
    </pre>
  );
};

export default DiffViewer;
