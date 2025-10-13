import React from 'react';

interface BreadcrumbProps {
  filePath?: string;
  onPathClick?: (path: string) => void;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ filePath, onPathClick }) => {
  if (!filePath) {
    return (
      <div className="breadcrumb">
        <span className="breadcrumb-item">No file selected</span>
      </div>
    );
  }

  const pathParts = filePath.split(/[/\\]/).filter(Boolean);
  
  return (
    <div className="breadcrumb">
      {pathParts.map((part, index) => {
        const isLast = index === pathParts.length - 1;
        const currentPath = pathParts.slice(0, index + 1).join('/');
        
        return (
          <React.Fragment key={index}>
            <span 
              className={`breadcrumb-item ${isLast ? 'current' : ''}`}
              onClick={() => onPathClick?.(currentPath)}
              title={currentPath}
            >
              {part}
            </span>
            {!isLast && <span className="breadcrumb-separator">/</span>}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default Breadcrumb;
