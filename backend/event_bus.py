import queue
import threading
import time
from itertools import count


class InMemoryEventBus:
    """Simple queue-backed bus with per-subscriber buffers."""

    def __init__(self, max_queue_size: int = 500):
        self.max_queue_size = max_queue_size
        self._subscribers = {}
        self._subscriber_ids = count(1)
        self._lock = threading.Lock()

    def publish(self, event_type, payload):
        event = {
            "type": event_type,
            "timestamp": time.time(),
            "payload": payload
        }
        with self._lock:
            subscribers = list(self._subscribers.items())

        for subscriber_id, subscriber_queue in subscribers:
            try:
                subscriber_queue.put_nowait(event)
            except queue.Full:
                with self._lock:
                    self._subscribers.pop(subscriber_id, None)

    def subscribe(self):
        subscriber_id = next(self._subscriber_ids)
        subscriber_queue = queue.Queue(maxsize=self.max_queue_size)
        with self._lock:
            self._subscribers[subscriber_id] = subscriber_queue
        return subscriber_id, subscriber_queue

    def unsubscribe(self, subscriber_id):
        with self._lock:
            self._subscribers.pop(subscriber_id, None)
