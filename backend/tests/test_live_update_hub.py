from services.live_update_hub import LiveUpdateHub, to_sse


def test_live_update_hub_publishes_to_active_subscribers():
    hub = LiveUpdateHub()
    subscriber_id, subscriber_queue, replay_events = hub.subscribe()

    try:
        hub.publish("system_snapshot", {"hostname": "devbox"})
        event = subscriber_queue.get(timeout=0.1)
    finally:
        hub.unsubscribe(subscriber_id)

    assert replay_events == []
    assert event["id"] == 1
    assert event["type"] == "system_snapshot"
    assert event["payload"] == {"hostname": "devbox"}
    assert isinstance(event["timestamp"], float)


def test_live_update_hub_replays_buffered_events_after_last_event_id():
    hub = LiveUpdateHub()
    hub.publish("heartbeat", {"timestamp": 1.0})
    hub.publish("system_snapshot", {"hostname": "devbox"})
    hub.publish("process_snapshot", {"processes": []})

    subscriber_id, _, replay_events = hub.subscribe(last_event_id=1)
    hub.unsubscribe(subscriber_id)

    assert [event["id"] for event in replay_events] == [2, 3]
    assert [event["type"] for event in replay_events] == ["system_snapshot", "process_snapshot"]


def test_live_update_hub_keeps_lagging_subscribers_connected():
    hub = LiveUpdateHub(subscriber_queue_size=2)
    subscriber_id, subscriber_queue, _ = hub.subscribe()

    try:
        hub.publish("heartbeat", {"timestamp": 1.0})
        hub.publish("system_snapshot", {"hostname": "devbox"})
        hub.publish("process_snapshot", {"processes": []})
        backlog_notice = subscriber_queue.get(timeout=0.1)
        latest_event = subscriber_queue.get(timeout=0.1)
    finally:
        hub.unsubscribe(subscriber_id)

    assert backlog_notice["type"] == "stream_error"
    assert backlog_notice["payload"]["reason"] == "subscriber_lagging"
    assert latest_event["type"] == "process_snapshot"
    assert latest_event["id"] == 3


def test_live_update_hub_reports_replay_gap_when_buffer_is_exhausted():
    hub = LiveUpdateHub(replay_buffer_size=2)
    hub.publish("heartbeat", {"timestamp": 1.0})
    hub.publish("system_snapshot", {"hostname": "devbox"})
    hub.publish("process_snapshot", {"processes": []})

    subscriber_id, _, replay_events = hub.subscribe(last_event_id=0)
    hub.unsubscribe(subscriber_id)

    assert replay_events[0]["type"] == "stream_error"
    assert replay_events[0]["payload"]["reason"] == "replay_window_exceeded"
    assert [event["id"] for event in replay_events[1:]] == [2, 3]


def test_to_sse_serializes_payload_with_event_name_and_id():
    payload = to_sse({
        "id": 7,
        "type": "heartbeat",
        "payload": {"timestamp": 123.0},
    })

    assert payload == 'id: 7\nevent: heartbeat\ndata: {"timestamp": 123.0}\n\n'
