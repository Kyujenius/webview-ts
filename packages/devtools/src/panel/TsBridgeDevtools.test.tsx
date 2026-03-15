import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TsBridgeDevtools } from './TsBridgeDevtools';

function createMockBridge() {
  return { use: vi.fn() };
}

describe('TsBridgeDevtools', () => {
  it('renders toggle button when closed', () => {
    const bridge = createMockBridge();
    render(<TsBridgeDevtools bridge={bridge} />);

    const button = screen.getByTitle('Open ts-bridge DevTools');
    expect(button).toBeDefined();
    expect(button.textContent).toContain('ts-bridge');
  });

  it('renders custom buttonLabel', () => {
    const bridge = createMockBridge();
    render(<TsBridgeDevtools bridge={bridge} buttonLabel="my-bridge" />);

    expect(screen.getByTitle('Open ts-bridge DevTools').textContent).toContain('my-bridge');
  });

  it('opens panel when toggle button is clicked', () => {
    const bridge = createMockBridge();
    render(<TsBridgeDevtools bridge={bridge} />);

    fireEvent.click(screen.getByTitle('Open ts-bridge DevTools'));

    expect(screen.getByText('ts-bridge DevTools')).toBeDefined();
    expect(screen.getByTitle('Close')).toBeDefined();
  });

  it('renders panel immediately when initialOpen=true', () => {
    const bridge = createMockBridge();
    render(<TsBridgeDevtools bridge={bridge} initialOpen />);

    expect(screen.getByText('ts-bridge DevTools')).toBeDefined();
    expect(screen.getByText('Waiting for bridge messages...')).toBeDefined();
  });

  it('closes panel when close button is clicked', () => {
    const bridge = createMockBridge();
    render(<TsBridgeDevtools bridge={bridge} initialOpen />);

    fireEvent.click(screen.getByTitle('Close'));

    expect(screen.queryByText('ts-bridge DevTools')).toBeNull();
    expect(screen.getByTitle('Open ts-bridge DevTools')).toBeDefined();
  });

  it('calls bridge.use() with middleware on mount', () => {
    const bridge = createMockBridge();
    render(<TsBridgeDevtools bridge={bridge} />);

    expect(bridge.use).toHaveBeenCalledTimes(1);
    expect(bridge.use).toHaveBeenCalledWith(expect.objectContaining({ name: 'devtools' }));
  });

  it('renders filter buttons when panel is open', () => {
    const bridge = createMockBridge();
    render(<TsBridgeDevtools bridge={bridge} initialOpen />);

    expect(screen.getByText('All (0)')).toBeDefined();
    expect(screen.getByText('request')).toBeDefined();
    expect(screen.getByText('response')).toBeDefined();
    expect(screen.getByText('error')).toBeDefined();
  });

  it('renders Clear and Export buttons in toolbar', () => {
    const bridge = createMockBridge();
    render(<TsBridgeDevtools bridge={bridge} initialOpen />);

    expect(screen.getByTitle('Clear')).toBeDefined();
    expect(screen.getByTitle('Export JSON')).toBeDefined();
  });

  it('renders search input when panel is open', () => {
    const bridge = createMockBridge();
    render(<TsBridgeDevtools bridge={bridge} initialOpen />);

    expect(screen.getByPlaceholderText('Filter actions...')).toBeDefined();
  });
});
