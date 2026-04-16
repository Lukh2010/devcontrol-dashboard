import { http, HttpResponse } from 'msw';

import {
  authDisabledStatus,
  authEnabledStatus,
  networkInfoResponse,
  performanceResponse,
  portsResponse,
  processesResponse,
  systemInfoResponse,
} from './dashboardData';

export const handlers = [
  http.get('/api/auth/status', () => HttpResponse.json(authDisabledStatus)),
  http.post('/api/auth/validate', async () => HttpResponse.json({
    valid: true,
    configured: authEnabledStatus.enabled,
    required: authEnabledStatus.required,
  })),
  http.get('/api/system/info', () => HttpResponse.json(systemInfoResponse)),
  http.get('/api/system/performance', () => HttpResponse.json(performanceResponse)),
  http.get('/api/processes', () => HttpResponse.json(processesResponse)),
  http.get('/api/network/info', () => HttpResponse.json(networkInfoResponse)),
  http.get('/api/ports', () => HttpResponse.json(portsResponse)),
];
