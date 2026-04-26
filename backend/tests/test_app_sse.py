import queue

from app import create_app


class FakeTelemetry:
    def collect_system_snapshot(self):
        return {
            "system_info": {"hostname": "dev-box", "platform": "Windows"},
            "performance": {"cpu_percent": 5.0},
            "is_admin": False,
        }

    def collect_process_snapshot(self):
        return {"processes": [{"pid": 1234, "name": "python.exe"}]}

    def collect_network_snapshot(self):
        return {
            "ports": [{"port": 8000, "pid": 1234}],
            "network_info": {"hostname": "dev-box"},
        }


class FakeLiveUpdates:
    def __init__(self, replay_events=None, queued_events=None):
        self.last_event_id = None
        self.subscriber_id = 99
        self.subscriber_queue = queue.Queue()
        self.replay_events = list(replay_events or [])
        self.unsubscribed = []

        for event in queued_events or []:
            self.subscriber_queue.put_nowait(event)

    def subscribe(self, last_event_id=None):
        self.last_event_id = last_event_id
        return self.subscriber_id, self.subscriber_queue, list(self.replay_events)

    def unsubscribe(self, subscriber_id):
        self.unsubscribed.append(subscriber_id)


class FakeRuntime:
    def __init__(self, live_updates):
        self.live_updates = live_updates
        self.telemetry = FakeTelemetry()

    def start(self):
        return None


def _read_chunk(response):
    chunk = next(iter(response.response))
    if isinstance(chunk, bytes):
        return chunk.decode("utf-8")
    return chunk


def test_sse_stream_bootstraps_snapshots_before_live_updates():
    live_updates = FakeLiveUpdates(queued_events=[
        {
            "id": 4,
            "type": "action",
            "payload": {
                "action": "terminal_state",
                "status": "connected",
                "message": "Terminal session connected",
            },
        }
    ])
    app = create_app(FakeRuntime(live_updates))
    client = app.test_client()

    response = client.get("/api/events/stream", buffered=False)
    iterator = iter(response.response)
    chunks = []

    try:
        for _ in range(4):
            chunk = next(iterator)
            if isinstance(chunk, bytes):
                chunk = chunk.decode("utf-8")
            chunks.append(chunk)
    finally:
        response.close()

    assert chunks[0].startswith("event: system_snapshot\n")
    assert '"hostname": "dev-box"' in chunks[0]
    assert chunks[1].startswith("event: process_snapshot\n")
    assert '"pid": 1234' in chunks[1]
    assert chunks[2].startswith("event: network_snapshot\n")
    assert '"port": 8000' in chunks[2]
    assert chunks[3].startswith("id: 4\nevent: action\n")
    assert '"Terminal session connected"' in chunks[3]
    assert live_updates.unsubscribed == [99]


def test_sse_stream_replays_buffered_events_when_last_event_id_is_provided():
    live_updates = FakeLiveUpdates(replay_events=[
        {
            "id": 7,
            "type": "action",
            "payload": {
                "action": "run_command",
                "status": "success",
                "message": "Replayed action event",
            },
        }
    ])
    app = create_app(FakeRuntime(live_updates))
    client = app.test_client()

    response = client.get(
        "/api/events/stream",
        headers={"Last-Event-ID": "5"},
        buffered=False,
    )

    try:
        chunk = _read_chunk(response)
    finally:
        response.close()

    assert live_updates.last_event_id == 5
    assert chunk.startswith("id: 7\nevent: action\n")
    assert '"Replayed action event"' in chunk
    assert "system_snapshot" not in chunk
    assert live_updates.unsubscribed == [99]
