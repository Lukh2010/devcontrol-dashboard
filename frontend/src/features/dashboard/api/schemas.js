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

export const systemInfoSchema = z.object({
  platform: z.string(),
  platform_release: z.string(),
  platform_version: z.string(),
  architecture: z.string(),
  hostname: z.string(),
  processor: z.string(),
  cpu_count: z.number().nullable(),
  memory_total: z.number(),
  memory_available: z.number()
});

export const performanceSnapshotSchema = z.object({
  cpu_percent: z.number(),
  cpu_count: z.number().nullable(),
  memory: z.object({
    total: z.number(),
    available: z.number(),
    percent: z.number(),
    used: z.number(),
    free: z.number()
  }),
  disk: z.object({
    total: z.number(),
    used: z.number(),
    free: z.number(),
    percent: z.number()
  }),
  timestamp: z.number()
});

export const portSchema = z.object({
  port: z.number(),
  process_name: z.string(),
  pid: z.number(),
  status: z.string(),
  protocol: z.string().optional(),
  local_address: z.string().nullable().optional(),
  remote_address: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  exe_path: z.string().nullable().optional(),
  inventory_source: z.string().optional(),
  inventory_degraded: z.boolean().optional(),
  dashboard_owned: z.boolean().optional(),
  killable: z.boolean().optional(),
  kill_reason: z.string().nullable().optional()
});

export const processSchema = z.object({
  pid: z.number(),
  name: z.string(),
  cpu_percent: z.number(),
  memory_mb: z.number(),
  status: z.string(),
  parent_pid: z.number().optional(),
  username: z.string().nullable().optional(),
  exe_path: z.string().nullable().optional(),
  command_line: z.string().nullable().optional(),
  started_at: z.string().nullable().optional(),
  inventory_source: z.string().optional(),
  inventory_degraded: z.boolean().optional(),
  dashboard_owned: z.boolean().optional(),
  killable: z.boolean().optional(),
  kill_reason: z.string().nullable().optional()
});

export const networkAddressSchema = z.object({
  family: z.string(),
  address: z.string(),
  netmask: z.string().nullable().optional(),
  broadcast: z.string().nullable().optional()
});

export const networkInfoSchema = z.object({
  interfaces: z.record(z.array(networkAddressSchema)),
  default_gateway: z.string(),
  hostname: z.string()
});

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
});

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
