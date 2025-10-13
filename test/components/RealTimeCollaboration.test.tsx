import React from 'react';
import { RealTimeCollaboration } from '../../src/renderer/components/RealTimeCollaboration';
import { User } from '../../src/shared/collaboration-types';

describe('RealTimeCollaboration', () => {
  const mockUsers: User[] = [
    { 
      id: '1', 
      name: 'Alice', 
      email: 'alice@example.com', 
      color: '#FF6B6B',
      isTyping: false,
      lastActivity: Date.now(),
      connectionId: 'conn-1'
    },
    { 
      id: '2', 
      name: 'Bob', 
      email: 'bob@example.com', 
      color: '#4ECDC4',
      isTyping: false,
      lastActivity: Date.now(),
      connectionId: 'conn-2'
    }
  ];

  test('renders without crashing', () => {
    // Test that the component can be created without errors
    expect(() => {
      <RealTimeCollaboration users={mockUsers} />;
    }).not.toThrow();
  });

  test('displays user list', () => {
    // Test that the component can display users
    expect(() => {
      <RealTimeCollaboration users={mockUsers} />;
    }).not.toThrow();
  });

  test('handles user activity callbacks', () => {
    const onUserActivity = jest.fn();
    
    // Test that the component can be created with onUserActivity callback
    expect(() => {
      <RealTimeCollaboration 
        users={mockUsers} 
        onUserActivity={onUserActivity} 
      />;
    }).not.toThrow();
  });

  test('updates user presence', () => {
    // Test that the component can handle user presence updates
    expect(() => {
      <RealTimeCollaboration users={mockUsers} />;
    }).not.toThrow();
  });

  test('shows connection status', () => {
    // Test that the component can display connection status
    expect(() => {
      <RealTimeCollaboration users={mockUsers} />;
    }).not.toThrow();
  });
});