import { z } from 'zod';

export const authStatusSchema = z.object({
  enabled: z.boolean(),
  required: z.boolean()
});

export const authValidationSchema = z.object({
  valid: z.boolean(),
  configured: z.boolean(),
  required: z.boolean().optional()
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
  status: z.string()
});

export const processSchema = z.object({
  pid: z.number(),
  name: z.string(),
  cpu_percent: z.number(),
  memory_mb: z.number(),
  status: z.string()
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
  status: z.string()
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
  timestamp: z.number().optional()
});

export const streamNetworkSnapshotSchema = z.object({
  ports: portsSchema.optional(),
  network_info: networkInfoSchema.optional(),
  timestamp: z.number().optional()
});
