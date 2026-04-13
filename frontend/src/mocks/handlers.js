import { http, HttpResponse } from 'msw';

import { createDashboardSnapshot } from './dashboardData';

const snapshot = createDashboardSnapshot();

export const handlers = [
  http.get('/api/auth/status', () => {
    return HttpResponse.json({ enabled: true, required: true });
  }),
  http.post('/api/auth/validate', async ({ request }) => {
    const body = await request.json().catch(() => ({}));
    return HttpResponse.json({
      valid: body.password === 'secret-123',
      configured: true,
      required: true
    });
  }),
  http.get('/api/system/info', () => HttpResponse.json(snapshot.systemInfo)),
  http.get('/api/system/performance', () => HttpResponse.json(snapshot.performance)),
  http.get('/api/processes', () => HttpResponse.json(snapshot.processes)),
  http.get('/api/ports', () => HttpResponse.json(snapshot.ports)),
  http.get('/api/network/info', () => HttpResponse.json(snapshot.networkInfo)),
  http.post('/api/processes/:pid/kill', ({ params }) => {
    return HttpResponse.json({
      success: true,
      message: `Process ${params.pid} killed successfully`,
      pid: Number(params.pid),
      name: 'mock-process'
    });
  }),
  http.delete('/api/port/:port', ({ params }) => {
    return HttpResponse.json({
      message: `Process on port ${params.port} terminated successfully`
    });
  }),
  http.get('/api/events/stream', () => {
    const stream = new ReadableStream({
      start(controller) {
        const emit = (eventType, payload) => {
          controller.enqueue(`event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`);
        };

        emit('system_snapshot', {
          system_info: snapshot.systemInfo,
          performance: snapshot.performance,
          is_admin: true
        });
        emit('process_snapshot', { processes: snapshot.processes });
        emit('network_snapshot', {
          ports: snapshot.ports,
          network_info: snapshot.networkInfo
        });
        emit('heartbeat', {});
      }
    });

    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream'
      }
    });
  })
];
