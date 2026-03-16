import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TsBridgeDevtools } from './TsBridgeDevtools';

function createMockBridge() {
  return { use: vi.fn(), prepend: vi.fn() };
}

function createMockTransport() {
  return {
    send: vi.fn(),
    onMessage: vi.fn(),
    onDisconnect: vi.fn(),
    connected: true,
    disconnect: vi.fn(),
  };
}

describe('TsBridgeDevtools', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('renders floating button', () => {
    const bridge = createMockBridge();
    const transport = createMockTransport();
    render(<TsBridgeDevtools bridge={bridge} transport={transport} />);

    const button = screen.getByTitle('Open ts-bridge DevTools');
    expect(button).toBeDefined();
    expect(button.textContent).toContain('ts-bridge');
  });

  it('renders custom buttonLabel', () => {
    const bridge = createMockBridge();
    const transport = createMockTransport();
    render(<TsBridgeDevtools bridge={bridge} buttonLabel="my-bridge" transport={transport} />);

    expect(screen.getByTitle('Open ts-bridge DevTools').textContent).toContain('my-bridge');
  });

  it('calls bridge.prepend() with middleware on mount', () => {
    const bridge = createMockBridge();
    const transport = createMockTransport();
    render(<TsBridgeDevtools bridge={bridge} transport={transport} />);

    expect(bridge.prepend).toHaveBeenCalledTimes(1);
    expect(bridge.prepend).toHaveBeenCalledWith(expect.objectContaining({ name: 'devtools' }));
  });

  it('falls back to bridge.use() when prepend is not available', () => {
    const bridge = { use: vi.fn() };
    const transport = createMockTransport();
    render(<TsBridgeDevtools bridge={bridge} transport={transport} />);

    expect(bridge.use).toHaveBeenCalledTimes(1);
    expect(bridge.use).toHaveBeenCalledWith(expect.objectContaining({ name: 'devtools' }));
  });

  it('renders nothing in production', () => {
    process.env.NODE_ENV = 'production';
    const bridge = createMockBridge();
    const transport = createMockTransport();
    const { container } = render(<TsBridgeDevtools bridge={bridge} transport={transport} />);

    expect(container.innerHTML).toBe('');
  });

  it('opens dashboard window on click', () => {
    const mockWindow = { closed: false, focus: vi.fn() };
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(mockWindow as unknown as Window);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const bridge = createMockBridge();
    const transport = createMockTransport();
    render(<TsBridgeDevtools bridge={bridge} transport={transport} />);

    fireEvent.click(screen.getByTitle('Open ts-bridge DevTools'));

    expect(openSpy).toHaveBeenCalledWith(
      'blob:mock',
      'ts-bridge-devtools',
      'width=1200,height=700'
    );

    openSpy.mockRestore();
  });

  it('disconnects transport on unmount', () => {
    const bridge = createMockBridge();
    const transport = createMockTransport();
    const { unmount } = render(<TsBridgeDevtools bridge={bridge} transport={transport} />);

    unmount();

    expect(transport.disconnect).toHaveBeenCalled();
  });
});
