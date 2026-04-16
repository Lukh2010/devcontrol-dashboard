import { describe, expect, it } from 'vitest';

import {
  actionEventSchema,
  authSessionDeleteSchema,
  authStatusSchema,
  networkInfoSchema,
  performanceSnapshotSchema,
  processesSchema,
  streamSystemSnapshotSchema
} from '../../features/dashboard/api/schemas';

describe('dashboard schemas', () => {
  it('parses auth status payloads', () => {
    const parsed = authStatusSchema.parse({
      enabled: false,
      required: false,
      session_active: false
    });

    expect(parsed.enabled).toBe(false);
    expect(parsed.required).toBe(false);
  });

  it('parses auth session delete payloads without a message', () => {
    const parsed = authSessionDeleteSchema.parse({
      success: true,
      session_active: false
    });

    expect(parsed.success).toBe(true);
    expect(parsed.session_active).toBe(false);
  });

  it('parses performance snapshots', () => {
    const parsed = performanceSnapshotSchema.parse({
      cpu_percent: 12.4,
      cpu_count: 8,
      memory: {
        total: 16,
        available: 8,
        percent: 50,
        used: 8,
        free: 8
      },
      disk: {
        total: 100,
        used: 20,
        free: 80,
        percent: 20
      },
      timestamp: 123
    });

    expect(parsed.disk.percent).toBe(20);
  });

  it('rejects malformed process payloads', () => {
    expect(() => processesSchema.parse([
      { pid: 'bad', name: 'python', cpu_percent: 1, memory_mb: 12, status: 'running' }
    ])).toThrow();
  });

  it('parses network info with mixed addresses', () => {
    const parsed = networkInfoSchema.parse({
      interfaces: {
        Ethernet: [
          { family: 'IPv4', address: '127.0.0.1', netmask: '255.255.255.0', broadcast: '127.0.0.255' },
          { family: 'IPv6', address: '::1', netmask: 'ffff::' }
        ]
      },
      default_gateway: '127.0.0.1',
      hostname: 'dev-machine'
    });

    expect(parsed.interfaces.Ethernet).toHaveLength(2);
  });

  it('accepts partial stream bootstrap snapshots', () => {
    const parsed = streamSystemSnapshotSchema.parse({
      system_info: {
        platform: 'Windows',
        platform_release: '11',
        platform_version: '10.0',
        architecture: 'AMD64',
        hostname: 'dev-box',
        processor: 'x86',
        cpu_count: 8,
        memory_total: 32,
        memory_available: 16
      }
    });

    expect(parsed.system_info?.hostname).toBe('dev-box');
  });

  it('parses enriched action events', () => {
    const parsed = actionEventSchema.parse({
      action: 'kill_process',
      status: 'success',
      message: 'Stopped process 100',
      severity: 'success',
      entity_type: 'process',
      entity_id: 100,
      retry_after: null,
      requires_admin: false,
      requires_password: true,
      timestamp: 123
    });

    expect(parsed.entity_type).toBe('process');
    expect(parsed.severity).toBe('success');
  });
});
