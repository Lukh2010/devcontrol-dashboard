import json
import queue
import threading
from itertools import count


def to_sse(event):
    data = json.dumps(event["payload"])
    return f"event: {event['type']}\ndata: {data}\n\n"


class StreamProcessor:
    """Consumes the internal event bus and fans out to SSE subscribers."""

    def __init__(self, event_bus, subscriber_queue_size: int = 200):
        self.event_bus = event_bus
        self.subscriber_queue_size = subscriber_queue_size
        self.subscribers = {}
        self._subscriber_ids = count(1)
        self._lock = threading.Lock()
        self._running = False
        self._thread = None
        self._bus_subscription_id = None
        self._bus_queue = None

    def start(self):
        if self._running:
            return
        self._bus_subscription_id, self._bus_queue = self.event_bus.subscribe()
        self._running = True
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def stop(self):
        self._running = False
        if self._bus_subscription_id is not None:
            self.event_bus.unsubscribe(self._bus_subscription_id)
            self._bus_subscription_id = None

    def subscribe(self):
        subscriber_id = next(self._subscriber_ids)
        subscriber_queue = queue.Queue(maxsize=self.subscriber_queue_size)
        with self._lock:
            self.subscribers[subscriber_id] = subscriber_queue
        return subscriber_id, subscriber_queue

    def unsubscribe(self, subscriber_id):
        with self._lock:
            self.subscribers.pop(subscriber_id, None)

    def _run(self):
        while self._running and self._bus_queue is not None:
            try:
                event = self._bus_queue.get(timeout=1)
            except queue.Empty:
                continue

            with self._lock:
                subscribers = list(self.subscribers.items())

            for subscriber_id, subscriber_queue in subscribers:
                try:
                    subscriber_queue.put_nowait(event)
                except queue.Full:
                    with self._lock:
                        self.subscribers.pop(subscriber_id, None)
