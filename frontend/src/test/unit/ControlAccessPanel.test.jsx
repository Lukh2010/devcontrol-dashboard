import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ControlAccessPanel from '../../components/ControlAccessPanel';

describe('ControlAccessPanel Component', () => {
  const defaultProps = {
    authBadge: { tone: 'status-success', label: 'Unlocked' },
    authHint: 'Active control session',
    authUnlocked: true,
    createAuthSessionMutation: { isPending: false },
    deleteAuthSessionMutation: { isPending: false },
    currentStats: {
      systemInfo: { hostname: 'test-node-01', platform: 'Linux', platform_release: '6.8.0', architecture: 'x86_64' },
      health: { api: { ready: true }, terminal: { thread_alive: true } }
    },
    passwordInput: '',
    passwordProtectionEnabled: true,
    setPasswordInput: vi.fn(),
    streamError: null,
    unlockControl: vi.fn(),
    lockControl: vi.fn()
  };

  it('renders Control Access title and Host information', () => {
    render(<ControlAccessPanel {...defaultProps} />);
    expect(screen.getByText('Control access')).toBeInTheDocument();
    expect(screen.getByText('test-node-01')).toBeInTheDocument();
  });

  it('renders API Server and Terminal WS endpoints', () => {
    render(<ControlAccessPanel {...defaultProps} />);
    expect(screen.getByText('127.0.0.1:8000')).toBeInTheDocument();
    expect(screen.getByText('127.0.0.1:8003')).toBeInTheDocument();
  });

  it('handles password input changes and unlock clicks', () => {
    const setPasswordInputMock = vi.fn();
    const unlockControlMock = vi.fn();

    render(
      <ControlAccessPanel
        {...defaultProps}
        authUnlocked={false}
        setPasswordInput={setPasswordInputMock}
        unlockControl={unlockControlMock}
      />
    );

    const input = screen.getByLabelText('Control Password');
    fireEvent.change(input, { target: { value: 'mysecret' } });
    expect(setPasswordInputMock).toHaveBeenCalledWith('mysecret');

    const unlockButton = screen.getByRole('button', { name: 'Unlock' });
    fireEvent.click(unlockButton);
    expect(unlockControlMock).toHaveBeenCalled();
  });
});
