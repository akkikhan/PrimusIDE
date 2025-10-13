import React, { createContext, useContext, useState } from 'react';

export interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  children: React.ReactNode;
}

interface SelectContextType {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = createContext<SelectContextType | undefined>(undefined);

export const Select: React.FC<SelectProps> = ({ 
  value: controlledValue, 
  onValueChange, 
  defaultValue = '', 
  children 
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const value = controlledValue ?? internalValue;
  
  const handleValueChange = (newValue: string) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
    setOpen(false);
  };

  return (
    <SelectContext.Provider value={{ value, onValueChange: handleValueChange, open, setOpen }}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  );
};

export interface SelectTriggerProps {
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
}

export const SelectTrigger: React.FC<SelectTriggerProps> = ({ 
  className = '', 
  children, 
  disabled = false 
}) => {
  const context = useContext(SelectContext);
  if (!context) {
    throw new Error('SelectTrigger must be used within a Select component');
  }

  return (
    <button
      type="button"
      role="combobox"
      aria-expanded={context.open}
      disabled={disabled}
      className={`flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      onClick={() => !disabled && context.setOpen(!context.open)}
    >
      {children}
      <span className="ml-2">▼</span>
    </button>
  );
};

export interface SelectValueProps {
  placeholder?: string;
  className?: string;
}

export const SelectValue: React.FC<SelectValueProps> = ({ placeholder, className = '' }) => {
  const context = useContext(SelectContext);
  if (!context) {
    throw new Error('SelectValue must be used within a Select component');
  }

  return (
    <span className={className}>
      {context.value || placeholder}
    </span>
  );
};

export interface SelectContentProps {
  className?: string;
  children: React.ReactNode;
}

export const SelectContent: React.FC<SelectContentProps> = ({ className = '', children }) => {
  const context = useContext(SelectContext);
  if (!context) {
    throw new Error('SelectContent must be used within a Select component');
  }

  if (!context.open) {
    return null;
  }

  return (
    <div className={`absolute top-full left-0 z-50 w-full min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 ${className}`}>
      {children}
    </div>
  );
};

export interface SelectItemProps {
  value: string;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
}

export const SelectItem: React.FC<SelectItemProps> = ({ 
  value, 
  className = '', 
  children, 
  disabled = false 
}) => {
  const context = useContext(SelectContext);
  if (!context) {
    throw new Error('SelectItem must be used within a Select component');
  }

  const isSelected = context.value === value;

  return (
    <div
      role="option"
      aria-selected={isSelected}
      className={`relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none ${
        disabled 
          ? 'pointer-events-none opacity-50' 
          : 'focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground'
      } ${className}`}
      onClick={() => !disabled && context.onValueChange(value)}
    >
      {isSelected && <span className="absolute left-2">✓</span>}
      {children}
    </div>
  );
};
