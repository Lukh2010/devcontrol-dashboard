export function createDashboardSnapshot(hostname = 'mock-devcontrol') {
  return {
    systemInfo: {
      platform: 'Windows',
      platform_release: '11',
      platform_version: '10.0',
      architecture: 'AMD64',
      hostname,
      processor: 'x86',
      cpu_count: 8,
      memory_total: 17179869184,
      memory_available: 8589934592
    },
    performance: {
      cpu_percent: 18.5,
      cpu_count: 8,
      memory: {
        total: 17179869184,
        available: 8589934592,
        percent: 50,
        used: 8589934592,
        free: 8589934592
      },
      disk: {
        total: 512000000000,
        used: 238000000000,
        free: 274000000000,
        percent: 46.5
      },
      timestamp: Date.now()
    },
    processes: [
      { pid: 4100, name: 'python.exe', cpu_percent: 7.4, memory_mb: 148.3, status: 'running' },
      { pid: 4216, name: 'node.exe', cpu_percent: 4.1, memory_mb: 212.6, status: 'sleeping' }
    ],
    ports: [
      { port: 3000, process_name: 'node.exe', pid: 4216, status: 'LISTEN' },
      { port: 8000, process_name: 'python.exe', pid: 4100, status: 'LISTEN' }
    ],
    networkInfo: {
      interfaces: {
        Ethernet: [
          { family: 'IPv4', address: '192.168.0.42', netmask: '255.255.255.0', broadcast: '192.168.0.255' }
        ]
      },
      default_gateway: '192.168.0.1',
      hostname
    }
  };
}
