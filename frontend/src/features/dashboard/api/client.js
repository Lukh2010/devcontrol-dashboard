import {
  apiErrorSchema,
  apiMessageSchema,
  auditLogsResponseSchema,
  authSessionDeleteSchema,
  authSessionSchema,
  authStatusSchema,
  authValidationSchema,
  healthSchema,
  networkInfoSchema,
  performanceSnapshotSchema,
  portsSchema,
  processesSchema,
  stopPreviewSchema,
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
  health: ['health'],
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
    body: JSON.stringify({ password })
  }, authSessionSchema);
}

export function deleteAuthSession() {
  return mutateJson('/api/auth/session', {
    method: 'DELETE'
  }, authSessionDeleteSchema);
}

export function fetchSystemAdmin() {
  return getJson('/api/system/is-admin', systemAdminSchema);
}

export function fetchHealth() {
  return getJson('/api/health', healthSchema);
}

export function fetchSystemInfo() {
  return getJson('/api/system/info', systemInfoSchema);
}

export function fetchSystemPerformance() {
  return getJson('/api/system/performance', performanceSnapshotSchema);
}

export function fetchProcesses(options = {}) {
  const query = buildSearchParams({
    search: options.search,
    sort: options.sort,
    limit: options.limit,
    dashboard_only: options.dashboardOnly,
    killable_only: options.killableOnly
  });
  return getJson(`/api/processes${query}`, processesSchema);
}

export function fetchPorts(options = {}) {
  const query = buildSearchParams({
    search: options.search,
    sort: options.sort,
    limit: options.limit,
    dashboard_only: options.dashboardOnly,
    killable_only: options.killableOnly
  });
  return getJson(`/api/ports${query}`, portsSchema);
}

export function fetchNetworkInfo() {
  return getJson('/api/network/info', networkInfoSchema);
}

export function executeCommand({ command, name, controlPassword }) {
  return mutateJson('/api/commands/run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-DevControl-Password': controlPassword || ''
    },
    body: JSON.stringify({ command, name })
  }, apiMessageSchema);
}

export function killProcessByPort({ port, controlPassword, pid, protocol, localAddress }) {
  const query = buildSearchParams({
    pid,
    protocol,
    local_address: localAddress
  });
  return mutateJson(`/api/port/${port}${query}`, {
    method: 'DELETE',
    headers: {
      'X-DevControl-Password': controlPassword || ''
    }
  }, apiMessageSchema);
}

export function previewPortStop({ port, controlPassword, pid, protocol, localAddress }) {
  const query = buildSearchParams({
    pid,
    protocol,
    local_address: localAddress
  });
  return mutateJson(`/api/port/${port}/stop-preview${query}`, {
    method: 'GET',
    headers: {
      'X-DevControl-Password': controlPassword || ''
    }
  }, stopPreviewSchema);
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

export function previewProcessStop({ pid, controlPassword }) {
  return mutateJson(`/api/processes/${pid}/stop-preview`, {
    method: 'GET',
    headers: {
      'X-DevControl-Password': controlPassword || ''
    }
  }, stopPreviewSchema);
}

export function fetchAuditLogs(options = {}) {
  const query = buildSearchParams({
    limit: options.limit,
    offset: options.offset,
    severity: options.severity,
    action: options.action,
    search: options.search
  });
  return getJson(`/api/audit/logs${query}`, auditLogsResponseSchema);
}
