// TEST SUITE 2: Button System Validation
// Tests button rendering, interactions, and styling

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Button, IconButton, ButtonGroup } from '../../src/renderer/components/Button';

describe('Button Component Tests', () => {
  
  test('Button renders with correct text', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });
  
  test('Button variants apply correct classes', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-primary');
    
    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-secondary');
    
    rerender(<Button variant="danger">Danger</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-danger');
    
    rerender(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-ghost');
  });
  
  test('Button sizes apply correct classes', () => {
    const { rerender } = render(<Button size="small">Small</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-small');
    
    rerender(<Button size="medium">Medium</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-medium');
    
    rerender(<Button size="large">Large</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-large');
  });
  
  test('Button handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  test('Disabled button prevents clicks', () => {
    const handleClick = jest.fn();
    render(<Button disabled onClick={handleClick}>Disabled</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).toBeDisabled();
  });
  
  test('Loading state shows spinner and disables button', () => {
    const handleClick = jest.fn();
    render(<Button loading onClick={handleClick}>Loading</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('btn-loading');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });
  
  test('Full width button spans container', () => {
    render(<Button fullWidth>Full Width</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-full');
  });
  
  test('IconButton renders with label', () => {
    render(<IconButton icon="⚙️" label="Settings" />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Settings');
    expect(button).toHaveAttribute('title', 'Settings');
  });
  
  test('IconButton active state applies correct class', () => {
    render(<IconButton icon="🔍" label="Search" active />);
    expect(screen.getByRole('button')).toHaveClass('active');
  });
  
  test('ButtonGroup renders children', () => {
    render(
      <ButtonGroup>
        <Button>One</Button>
        <Button>Two</Button>
        <Button>Three</Button>
      </ButtonGroup>
    );
    
    expect(screen.getByText('One')).toBeInTheDocument();
    expect(screen.getByText('Two')).toBeInTheDocument();
    expect(screen.getByText('Three')).toBeInTheDocument();
  });
  
  test('ButtonGroup vertical variant applies correct class', () => {
    const { container } = render(
      <ButtonGroup vertical>
        <Button>One</Button>
        <Button>Two</Button>
      </ButtonGroup>
    );
    
    expect(container.querySelector('.btn-group-vertical')).toBeInTheDocument();
  });
});

// Integration Tests
describe('Button Integration Tests', () => {
  
  test('Multiple buttons can coexist without conflicts', () => {
    const handlePrimary = jest.fn();
    const handleSecondary = jest.fn();
    
    render(
      <div>
        <Button variant="primary" onClick={handlePrimary}>Primary</Button>
        <Button variant="secondary" onClick={handleSecondary}>Secondary</Button>
      </div>
    );
    
    fireEvent.click(screen.getByText('Primary'));
    expect(handlePrimary).toHaveBeenCalledTimes(1);
    expect(handleSecondary).not.toHaveBeenCalled();
    
    fireEvent.click(screen.getByText('Secondary'));
    expect(handleSecondary).toHaveBeenCalledTimes(1);
  });
  
  test('Button state changes work correctly', () => {
    const { rerender } = render(<Button>Normal</Button>);
    const button = screen.getByRole('button');
    
    expect(button).not.toBeDisabled();
    expect(button).not.toHaveClass('btn-loading');
    
    rerender(<Button loading>Loading</Button>);
    expect(button).toBeDisabled();
    expect(button).toHaveClass('btn-loading');
    
    rerender(<Button disabled>Disabled</Button>);
    expect(button).toBeDisabled();
    expect(button).toHaveClass('btn-disabled');
  });
});
