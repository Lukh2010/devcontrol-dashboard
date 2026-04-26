import json
import queue
import threading
import time
from collections import deque
from dataclasses import dataclass
from itertools import count


@dataclass
class _SubscriberState:
    """Tracks one SSE subscriber queue and any lag information."""

    queue: queue.Queue


def to_sse(event):
    """Serialize one live update into SSE wire format."""
    data = json.dumps(event["payload"])
    lines = []
    event_id = event.get("id")
    if event_id is not None:
        lines.append(f"id: {event_id}")
    lines.append(f"event: {event['type']}")
    lines.append(f"data: {data}")
    return "\n".join(lines) + "\n\n"


class LiveUpdateHub:
    """Owns in-process live event publication and SSE subscriber fanout."""

    def __init__(self, subscriber_queue_size: int = 200, replay_buffer_size: int = 250):
        self.subscriber_queue_size = subscriber_queue_size
        self.replay_buffer_size = replay_buffer_size
        self._subscribers = {}
        self._event_ids = count(1)
        self._subscriber_ids = count(1)
        self._history = deque(maxlen=replay_buffer_size)
        self._lock = threading.Lock()

    def publish(self, event_type, payload):
        event = {
            "id": next(self._event_ids),
            "type": event_type,
            "timestamp": time.time(),
            "payload": payload,
        }
        with self._lock:
            self._history.append(event)
            subscribers = list(self._subscribers.items())

        for _, subscriber in subscribers:
            self._enqueue_event(subscriber, event)

    def subscribe(self, last_event_id: int | None = None):
        """Register one subscriber and return any buffered events to replay."""
        subscriber_id = next(self._subscriber_ids)
        subscriber = _SubscriberState(queue=queue.Queue(maxsize=self.subscriber_queue_size))

        with self._lock:
            replay_events = self._build_replay_events(last_event_id)
            self._subscribers[subscriber_id] = subscriber

        return subscriber_id, subscriber.queue, replay_events

    def _build_replay_events(self, last_event_id: int | None):
        if last_event_id is None:
            return []

        history = list(self._history)
        if not history:
            return []

        oldest_id = history[0]["id"]
        replay_events = [event for event in history if event["id"] > last_event_id]
        if replay_events and last_event_id < oldest_id - 1:
            replay_events.insert(0, {
                "type": "stream_error",
                "payload": {
                    "reason": "replay_window_exceeded",
                    "message": "Some live updates were missed while reconnecting. Current state will continue streaming.",
                    "last_event_id": last_event_id,
                    "oldest_available_event_id": oldest_id,
                    "timestamp": time.time(),
                },
            })
        return replay_events

    def _enqueue_event(self, subscriber: _SubscriberState, event):
        try:
            subscriber.queue.put_nowait(event)
        except queue.Full:
            self._replace_queue_with_gap_notice(subscriber, event)

    def _replace_queue_with_gap_notice(self, subscriber: _SubscriberState, current_event):
        dropped_events = 1 + self._drain_queue(subscriber.queue)
        if subscriber.queue.maxsize <= 1:
            subscriber.queue.put_nowait(current_event)
            return

        notice = {
            "type": "stream_error",
            "payload": {
                "reason": "subscriber_lagging",
                "message": "Live updates briefly lagged. Recent events were dropped to keep the stream alive.",
                "dropped_events": dropped_events,
                "latest_event_id": current_event.get("id"),
                "timestamp": time.time(),
            },
        }
        subscriber.queue.put_nowait(notice)
        subscriber.queue.put_nowait(current_event)

    def _drain_queue(self, subscriber_queue: queue.Queue) -> int:
        dropped = 0
        while True:
            try:
                subscriber_queue.get_nowait()
                dropped += 1
            except queue.Empty:
                return dropped

    def unsubscribe(self, subscriber_id):
        with self._lock:
            self._subscribers.pop(subscriber_id, None)
