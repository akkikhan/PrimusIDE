// Button System Fix - Comprehensive button styles and interactions
import React from 'react';
import './styles/buttons.css';

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  children,
  onClick,
  className = '',
  type = 'button'
}) => {
  const classNames = [
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    fullWidth && 'btn-full',
    loading && 'btn-loading',
    disabled && 'btn-disabled',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={classNames}
      disabled={disabled || loading}
      onClick={onClick}
      aria-busy={loading}
    >
      {loading && (
        <span className="btn-spinner" aria-hidden="true" />
      )}
      {!loading && icon && (
        <span className="btn-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="btn-text">{children}</span>
    </button>
  );
};

export const IconButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
}> = ({ icon, label, onClick, active = false, disabled = false, size = 'medium' }) => {
  return (
    <button
      className={`icon-btn icon-btn-${size} ${active ? 'active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  );
};

export const ButtonGroup: React.FC<{
  children: React.ReactNode;
  vertical?: boolean;
}> = ({ children, vertical = false }) => {
  return (
    <div className={`btn-group ${vertical ? 'btn-group-vertical' : ''}`}>
      {children}
    </div>
  );
};
