import { z } from 'zod';

export const authStatusSchema = z.object({
  enabled: z.boolean(),
  required: z.boolean(),
  session_active: z.boolean().optional()
});

export const authValidationSchema = z.object({
  valid: z.boolean(),
  configured: z.boolean(),
  required: z.boolean().optional(),
  session_active: z.boolean().optional(),
  message: z.string().optional()
});

export const authSessionSchema = authValidationSchema.extend({
  error: z.string().optional()
});

export const authSessionDeleteSchema = z.object({
  success: z.boolean(),
  session_active: z.boolean().optional(),
  message: z.string().optional()
});

export const systemAdminSchema = z.object({
  is_admin: z.boolean(),
  platform: z.string()
});

export const healthSchema = z.object({
  api: z.object({
    host: z.string(),
    port: z.number(),
    ready: z.boolean()
  }).optional(),
  terminal: z.object({
    host: z.string(),
    port: z.number(),
    thread_alive: z.boolean(),
    session_count: z.number(),
    max_sessions: z.number()
  }).optional(),
  pid_file: z.object({
    path: z.string(),
    exists: z.boolean(),
    writable: z.boolean(),
    error: z.string().nullable().optional()
  }).optional(),
  password: z.object({
    enabled: z.boolean(),
    session_active: z.boolean()
  }).optional(),
  admin: z.boolean().optional()
}).passthrough();

export const systemInfoSchema = z.object({
  platform: z.string(),
  platform_release: z.string(),
  platform_version: z.string(),
  architecture: z.string(),
  hostname: z.string(),
  processor: z.string(),
  python_version: z.string(),
  cpu_count: z.number(),
  total_memory: z.number()
});

export const performanceSnapshotSchema = z.object({
  cpu_percent: z.number(),
  memory_used: z.number(),
  memory_total: z.number(),
  memory_percent: z.number(),
  disk_used: z.number().optional(),
  disk_total: z.number().optional(),
  disk_percent: z.number().optional(),
  boot_time: z.number().optional(),
  timestamp: z.number().optional()
}).passthrough();

export const processSchema = z.object({
  pid: z.number(),
  name: z.string(),
  cpu_percent: z.number(),
  memory_mb: z.number(),
  status: z.string(),
  parent_pid: z.number().nullable().optional(),
  started_at: z.number().nullable().optional(),
  inventory_source: z.string().optional(),
  inventory_degraded: z.boolean().optional(),
  dashboard_owned: z.boolean().optional(),
  owner_scope: z.string().optional(),
  external_killable: z.boolean().optional(),
  killable: z.boolean().optional(),
  block_reason: z.string().nullable().optional(),
  kill_reason: z.string().nullable().optional(),
  sensitive_masked: z.boolean().optional()
}).passthrough();

export const portSchema = z.object({
  port: z.number(),
  process_name: z.string(),
  pid: z.number().nullable().optional(),
  status: z.string().optional(),
  protocol: z.string().optional(),
  local_address: z.string().optional(),
  state: z.string().optional(),
  inventory_source: z.string().optional(),
  inventory_degraded: z.boolean().optional(),
  dashboard_owned: z.boolean().optional(),
  owner_scope: z.string().optional(),
  external_killable: z.boolean().optional(),
  killable: z.boolean().optional(),
  block_reason: z.string().nullable().optional(),
  kill_reason: z.string().nullable().optional(),
  sensitive_masked: z.boolean().optional()
}).passthrough();

export const networkAddressSchema = z.object({
  family: z.string(),
  address: z.string(),
  netmask: z.string().nullable().optional(),
  broadcast: z.string().nullable().optional(),
  ptp: z.string().nullable().optional()
}).passthrough();

export const networkInterfaceSchema = z.array(networkAddressSchema);

export const networkInfoSchema = z.object({
  hostname: z.string(),
  default_gateway: z.string(),
  interfaces: z.record(networkInterfaceSchema),
  sensitive_masked: z.boolean().optional()
}).passthrough();

export const actionEventSchema = z.object({
  action: z.string(),
  status: z.string(),
  message: z.string().optional(),
  severity: z.string().optional(),
  entity_type: z.string().nullable().optional(),
  entity_id: z.union([z.string(), z.number()]).nullable().optional(),
  retry_after: z.number().nullable().optional(),
  requires_admin: z.boolean().optional(),
  requires_password: z.boolean().optional(),
  timestamp: z.number().optional()
}).passthrough();

export const apiMessageSchema = z.object({
  message: z.string()
}).passthrough();

export const stopPreviewSchema = z.object({
  action: z.string(),
  dry_run: z.boolean(),
  allowed: z.boolean(),
  reason: z.string().nullable().optional(),
  message: z.string(),
  target: z.record(z.any()).optional(),
  policy: z.record(z.any()).optional(),
  matches: z.array(z.record(z.any())).optional()
}).passthrough();

export const apiErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional()
});

export const portsSchema = z.array(portSchema);
export const processesSchema = z.array(processSchema);

export const streamSystemSnapshotSchema = z.object({
  system_info: systemInfoSchema.optional(),
  performance: performanceSnapshotSchema.optional(),
  is_admin: z.boolean().optional(),
  timestamp: z.number().optional()
});

export const streamProcessSnapshotSchema = z.object({
  processes: processesSchema.optional(),
  inventory_source: z.string().optional(),
  inventory_degraded: z.boolean().optional(),
  timestamp: z.number().optional()
});

export const streamNetworkSnapshotSchema = z.object({
  ports: portsSchema.optional(),
  inventory_source: z.string().optional(),
  inventory_degraded: z.boolean().optional(),
  network_info: networkInfoSchema.optional(),
  timestamp: z.number().optional()
});

export const auditEntrySchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  action: z.string(),
  status: z.string(),
  severity: z.string(),
  message: z.string(),
  entity_type: z.string().nullable().optional(),
  entity_id: z.union([z.string(), z.number()]).nullable().optional(),
  requires_admin: z.boolean().optional(),
  requires_password: z.boolean().optional(),
  sensitive_masked: z.boolean().optional()
}).passthrough();

export const auditLogsResponseSchema = z.object({
  total: z.number(),
  logs: z.array(auditEntrySchema),
  limit: z.number(),
  offset: z.number()
});
