import logging
import os
import re
import time
import uuid
from datetime import datetime, timezone

from flask import Flask, jsonify, request

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

DEVICE_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{1,127}$")
EXPECTED_TOKEN = os.getenv("MOCK_API_TOKEN", "")


def completed_at() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def response(device_id: str, action: str, message: str, status: str = "succeeded", code: int = 200):
    payload = {
        "accepted": 200 <= code < 300,
        "status": status,
        "message": message,
        "deviceId": device_id,
        "action": action,
        "completedAt": completed_at(),
    }
    if action == "reboot_device" and payload["accepted"]:
        payload["commandId"] = f"cmd-{uuid.uuid4().hex[:8]}"
    return jsonify(payload), code


def validate_request(device_id: str):
    app.logger.info(
        "mock device action method=%s path=%s deviceId=%s simulate=%s",
        request.method,
        request.path,
        device_id,
        request.args.get("simulate", ""),
    )
    if EXPECTED_TOKEN and request.headers.get("Authorization") != f"Bearer {EXPECTED_TOKEN}":
        return response(device_id, "unknown", "Missing or invalid bearer token", "denied", 401)
    if not DEVICE_ID_PATTERN.fullmatch(device_id):
        return response(device_id, "unknown", "Invalid device ID", "failed", 400)

    simulation = request.args.get("simulate", "")
    if simulation == "timeout" or device_id.startswith("slow"):
        time.sleep(float(os.getenv("MOCK_API_DELAY_SECONDS", "12")))
    if simulation == "denied" or device_id.startswith("denied"):
        return response(device_id, "unknown", "Action denied by mock policy", "denied", 403)
    if simulation == "not_found":
        return response(device_id, "unknown", "Device not found", "failed", 404)
    if simulation == "failed" or device_id.startswith("fail"):
        return response(device_id, "unknown", "Simulated backend failure", "failed", 500)
    return None


@app.get("/health")
def health():
    return jsonify({"status": "ok", "service": "device-action-mock-api"})


@app.post("/devices/<device_id>/alerts/cancel")
def cancel_alert(device_id: str):
    error = validate_request(device_id)
    return error or response(device_id, "cancel_alert", "Alert cancelled")


@app.post("/devices/<device_id>/alarms/acknowledge")
def acknowledge_alarm(device_id: str):
    error = validate_request(device_id)
    return error or response(device_id, "acknowledge_alarm", "Alarm acknowledged")


@app.post("/devices/<device_id>/reboot")
def reboot_device(device_id: str):
    error = validate_request(device_id)
    return error or response(device_id, "reboot_device", "Reboot queued", "queued", 202)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)

