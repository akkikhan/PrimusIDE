import React from 'react';

export interface SliderProps {
  value?: number[];
  onValueChange?: (value: number[]) => void;
  defaultValue?: number[];
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

export const Slider: React.FC<SliderProps> = ({
  value: controlledValue,
  onValueChange,
  defaultValue = [0],
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  className = '',
  orientation = 'horizontal'
}) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const value = controlledValue ?? internalValue;
  
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = [parseFloat(event.target.value)];
    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  };

  const currentValue = Array.isArray(value) ? value[0] : value;

  return (
    <div className={`relative flex items-center ${className}`}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={currentValue}
        disabled={disabled}
        onChange={handleChange}
        className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } slider`}
      />
      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
};
