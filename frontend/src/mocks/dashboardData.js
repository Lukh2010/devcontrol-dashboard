export const authEnabledStatus = {
  enabled: true,
  required: true,
};

export const authDisabledStatus = {
  enabled: false,
  required: false,
};

export const systemInfoResponse = {
  hostname: 'dev-box',
  platform: 'Windows',
  platform_release: '11',
  platform_version: '10.0',
  architecture: 'AMD64',
  processor: 'x86',
  cpu_count: 8,
  memory_total: 17179869184,
  memory_available: 8589934592,
};

export const performanceResponse = {
  cpu_percent: 11.2,
  cpu_count: 8,
  memory: {
    total: 17179869184,
    available: 8589934592,
    percent: 50,
    used: 8589934592,
    free: 8589934592,
  },
  disk: {
    total: 536870912000,
    used: 214748364800,
    free: 322122547200,
    percent: 40,
  },
  timestamp: Date.now(),
};

export const processesResponse = [];

export const networkInfoResponse = {
  interfaces: {},
  default_gateway: '127.0.0.1',
  hostname: 'dev-box',
};

export const portsResponse = [];
