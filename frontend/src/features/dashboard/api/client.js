import {
  apiErrorSchema,
  apiMessageSchema,
  authSessionDeleteSchema,
  authSessionSchema,
  authStatusSchema,
  authValidationSchema,
  networkInfoSchema,
  performanceSnapshotSchema,
  portsSchema,
  processesSchema,
  systemAdminSchema,
  systemInfoSchema
} from './schemas';

export class ApiRequestError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = details.status ?? null;
    this.retryAfter = details.retryAfter ?? null;
    this.payload = details.payload ?? null;
  }
}

function buildSearchParams(options = {}) {
  const params = new URLSearchParams();

  Object.entries(options).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === false) {
      return;
    }
    params.set(key, String(value));
  });

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

async function parseJson(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const parsedError = apiErrorSchema.safeParse(payload);
    const message = parsedError.success
      ? parsedError.data.error
      : payload.message || payload.error || `HTTP ${response.status}`;
    const retryAfter = payload.retry_after ?? response.headers.get('Retry-After') ?? null;
    throw new ApiRequestError(message, {
      status: response.status,
      retryAfter: retryAfter ? parseInt(retryAfter, 10) : null,
      payload
    });
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
  authSession: ['auth-session'],
  systemAdmin: ['system-admin'],
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

export function createAuthSession(password) {
  return mutateJson('/api/auth/session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'same-origin',
    body: JSON.stringify({ password })
  }, authSessionSchema);
}

export function deleteAuthSession() {
  return mutateJson('/api/auth/session', {
    method: 'DELETE',
    credentials: 'same-origin'
  }, authSessionDeleteSchema);
}

export function fetchSystemInfo() {
  return getJson('/api/system/info', systemInfoSchema);
}

export function fetchSystemPerformance() {
  return getJson('/api/system/performance', performanceSnapshotSchema);
}

export function fetchSystemAdmin() {
  return getJson('/api/system/is-admin', systemAdminSchema);
}

export function fetchProcesses(options = {}) {
  return getJson(`/api/processes${buildSearchParams(options)}`, processesSchema);
}

export function fetchPorts(options = {}) {
  return getJson(`/api/ports${buildSearchParams(options)}`, portsSchema);
}

export function fetchNetworkInfo() {
  return getJson('/api/network/info', networkInfoSchema);
}

export function systemInfoQueryOptions() {
  return {
    queryKey: dashboardQueryKeys.systemInfo,
    queryFn: fetchSystemInfo
  };
}

export function systemPerformanceQueryOptions() {
  return {
    queryKey: dashboardQueryKeys.systemPerformance,
    queryFn: fetchSystemPerformance
  };
}

export function systemAdminQueryOptions() {
  return {
    queryKey: dashboardQueryKeys.systemAdmin,
    queryFn: fetchSystemAdmin
  };
}

export function processesQueryOptions() {
  return {
    queryKey: dashboardQueryKeys.processes,
    queryFn: () => fetchProcesses({ limit: 500 })
  };
}

export function portsQueryOptions() {
  return {
    queryKey: dashboardQueryKeys.ports,
    queryFn: () => fetchPorts({ limit: 500 })
  };
}

export function networkInfoQueryOptions() {
  return {
    queryKey: dashboardQueryKeys.networkInfo,
    queryFn: fetchNetworkInfo
  };
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
