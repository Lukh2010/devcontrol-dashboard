import {
  apiErrorSchema,
  apiMessageSchema,
  authStatusSchema,
  authValidationSchema,
  networkInfoSchema,
  performanceSnapshotSchema,
  portsSchema,
  processesSchema,
  systemInfoSchema
} from './schemas';

async function parseJson(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const parsedError = apiErrorSchema.safeParse(payload);
    const message = parsedError.success ? parsedError.data.error : `HTTP ${response.status}`;
    throw new Error(message);
  }
  return payload;
}

async function getJson(path, schema) {
  const response = await fetch(path);
  const payload = await parseJson(response);
  return schema.parse(payload);
}

async function mutateJson(path, options, schema) {
  const response = await fetch(path, options);
  const payload = await parseJson(response);
  return schema.parse(payload);
}

export const dashboardQueryKeys = {
  authStatus: ['auth-status'],
  validatePassword: (password) => ['auth-validate', password],
  systemInfo: ['system-info'],
  systemPerformance: ['system-performance'],
  processes: ['processes'],
  ports: ['ports'],
  networkInfo: ['network-info']
};

export function fetchAuthStatus() {
  return getJson('/api/auth/status', authStatusSchema);
}

export function validatePassword(password) {
  return mutateJson('/api/auth/validate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ password })
  }, authValidationSchema);
}

export function fetchSystemInfo() {
  return getJson('/api/system/info', systemInfoSchema);
}

export function fetchSystemPerformance() {
  return getJson('/api/system/performance', performanceSnapshotSchema);
}

export function fetchProcesses() {
  return getJson('/api/processes', processesSchema);
}

export function fetchPorts() {
  return getJson('/api/ports', portsSchema);
}

export function fetchNetworkInfo() {
  return getJson('/api/network/info', networkInfoSchema);
}

export function killPort({ port, controlPassword }) {
  return mutateJson(`/api/port/${port}`, {
    method: 'DELETE',
    headers: {
      'X-DevControl-Password': controlPassword || ''
    }
  }, apiMessageSchema);
}

export function killProcess({ pid, controlPassword }) {
  return mutateJson(`/api/processes/${pid}/kill`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-DevControl-Password': controlPassword || ''
    }
  }, apiMessageSchema.extend({
    success: authValidationSchema.shape.valid.optional(),
    pid: processesSchema.element.shape.pid.optional(),
    name: processesSchema.element.shape.name.optional()
  }));
}
