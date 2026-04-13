import json
import queue
import threading
import time
from itertools import count


class DashboardEventPublisher:
    """In-process pub/sub publisher for dashboard snapshots and action events."""

    def __init__(self, collectors=None):
        self.collectors = collectors or {}
        self.subscribers = {}
        self._subscriber_ids = count(1)
        self._lock = threading.Lock()
        self._running = False
        self._thread = None
        self._last_emitted = {}

    def start(self):
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def stop(self):
        self._running = False

    def _run(self):
        while self._running:
            now = time.time()
            self.publish("heartbeat", {"timestamp": now})

            for event_type, collector in self.collectors.items():
                interval = max(float(collector.get("interval", 5)), 1.0)
                last = self._last_emitted.get(event_type, 0.0)
                if now - last < interval:
                    continue

                try:
                    payload = collector["collect"]()
                    if isinstance(payload, dict) and "timestamp" not in payload:
                        payload["timestamp"] = now
                    self.publish(event_type, payload)
                    self._last_emitted[event_type] = now
                except Exception as exc:
                    self.publish("stream_error", {
                        "event_type": event_type,
                        "error": str(exc),
                        "timestamp": now
                    })

            time.sleep(1.0)

    def publish(self, event_type, payload):
        event = {
            "type": event_type,
            "timestamp": time.time(),
            "payload": payload
        }
        with self._lock:
            subscribers = list(self.subscribers.items())

        for subscriber_id, subscriber_queue in subscribers:
            try:
                subscriber_queue.put_nowait(event)
            except queue.Full:
                with self._lock:
                    self.subscribers.pop(subscriber_id, None)

    def subscribe(self):
        subscriber_id = next(self._subscriber_ids)
        subscriber_queue = queue.Queue(maxsize=200)
        with self._lock:
            self.subscribers[subscriber_id] = subscriber_queue
        return subscriber_id, subscriber_queue

    def unsubscribe(self, subscriber_id):
        with self._lock:
            self.subscribers.pop(subscriber_id, None)


def to_sse(event):
    data = json.dumps(event["payload"])
    return f"event: {event['type']}\ndata: {data}\n\n"
