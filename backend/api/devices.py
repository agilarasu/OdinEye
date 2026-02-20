"""Device CRUD API."""

from flask import Blueprint, request, jsonify
from models import create_device, get_device, get_all_devices, update_device, delete_device

bp = Blueprint("devices", __name__)


@bp.route("/", methods=["GET"])
def list_devices():
    """List all devices."""
    return jsonify(get_all_devices())


@bp.route("/", methods=["POST"])
def add_device():
    """Add device (manual entry)."""
    data = request.get_json() or {}
    name = data.get("name")
    device_type = data.get("type", "workstation")
    ip = data.get("ip", "")
    os_name = data.get("os", "")
    hardware = data.get("hardware", {})
    installed_apps = data.get("installed_apps", [])

    if not name:
        return jsonify({"error": "name is required"}), 400

    device = create_device(
        name=name,
        device_type=device_type,
        source="manual",
        ip=ip,
        os_name=os_name,
        hardware=hardware,
        installed_apps=installed_apps,
    )
    return jsonify(device), 201


@bp.route("/<device_id>", methods=["GET"])
def get_one(device_id):
    """Get single device."""
    device = get_device(device_id)
    if not device:
        return jsonify({"error": "device not found"}), 404
    return jsonify(device)


@bp.route("/<device_id>", methods=["PUT"])
def update_one(device_id):
    """Update device."""
    device = get_device(device_id)
    if not device:
        return jsonify({"error": "device not found"}), 404

    data = request.get_json() or {}
    allowed = ("name", "type", "ip", "os", "hardware", "installed_apps")
    updates = {k: data[k] for k in allowed if k in data}
    update_device(device_id, **updates)
    return jsonify(get_device(device_id))


@bp.route("/<device_id>", methods=["DELETE"])
def delete_one(device_id):
    """Delete device."""
    if not delete_device(device_id):
        return jsonify({"error": "device not found"}), 404
    return "", 204
