"""Agent registration API."""

from flask import Blueprint, request, jsonify
from models import create_device, get_device, get_all_devices, update_device

bp = Blueprint("agents", __name__)


def _find_device_by_hostname(hostname):
    """Find existing device by hostname (from agent)."""
    for d in get_all_devices():
        if d.get("name") == hostname and d.get("source") == "agent":
            return d
    return None


@bp.route("/register", methods=["POST"])
def register():
    """Agent self-registration. Creates or updates device with source=agent."""
    data = request.get_json() or {}
    hostname = data.get("hostname", "unknown")
    ip = data.get("ip", "")
    os_name = data.get("os", "")
    hardware = data.get("hardware") or {}
    installed_apps = data.get("installed_apps") or []

    existing = _find_device_by_hostname(hostname)
    if existing:
        update_device(
            existing["id"],
            ip=ip,
            os=os_name,
            hardware=hardware,
            installed_apps=installed_apps,
        )
        return jsonify(get_device(existing["id"]))

    device = create_device(
        name=hostname,
        device_type="workstation",
        source="agent",
        ip=ip,
        os_name=os_name,
        hardware=hardware,
        installed_apps=installed_apps,
        agent_id=data.get("agent_id"),
    )
    return jsonify(device), 201
