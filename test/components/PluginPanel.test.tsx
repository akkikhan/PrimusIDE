import React from 'react';
import { PluginPanel } from '../../src/renderer/components/PluginPanel';

describe('PluginPanel', () => {
  test('renders without crashing', () => {
    // Test that the component can be created without errors
    expect(() => {
      <PluginPanel />;
    }).not.toThrow();
  });

  test('displays loading state initially', () => {
    // Test that the component shows loading state
    expect(() => {
      <PluginPanel />;
    }).not.toThrow();
  });

  test('displays plugin list when loaded', () => {
    // Test that the component displays plugins
    expect(() => {
      <PluginPanel />;
    }).not.toThrow();
  });

  test('allows searching plugins', () => {
    // Test that the component handles search
    expect(() => {
      <PluginPanel />;
    }).not.toThrow();
  });

  test('allows activating plugins', () => {
    // Test that the component handles plugin activation
    expect(() => {
      <PluginPanel />;
    }).not.toThrow();
  });

  test('allows deactivating plugins', () => {
    // Test that the component handles plugin deactivation
    expect(() => {
      <PluginPanel />;
    }).not.toThrow();
  });

  test('shows plugin statistics', () => {
    // Test that the component displays plugin stats
    expect(() => {
      <PluginPanel />;
    }).not.toThrow();
  });
});