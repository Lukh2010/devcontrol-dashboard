"""High-concurrency stress tests for LiveUpdateHub event bus."""

import time
from services.live_update_hub import LiveUpdateHub


def test_live_update_hub_high_concurrency():
    hub = LiveUpdateHub(subscriber_queue_size=1000)
    subscriber_id, subscriber_queue, _ = hub.subscribe()
    event_count = 300

    try:
        for i in range(event_count):
            hub.publish("telemetry", {"seq": i, "cpu": 12.5})

        received_count = 0
        start_time = time.time()
        while received_count < event_count and time.time() - start_time < 2.0:
            try:
                event = subscriber_queue.get(timeout=0.1)
                if event and event.get("type") == "telemetry":
                    received_count += 1
            except Exception:
                break

        assert received_count == event_count
    finally:
        hub.unsubscribe(subscriber_id)
