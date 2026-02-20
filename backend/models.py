"""In-memory data models for device management mockup."""

from uuid import uuid4
from datetime import datetime
from copy import deepcopy

# In-memory stores (SQLite-ready structure)
devices = []
threat_scans = []


def _next_id():
    return str(uuid4())[:8]


def create_device(
    name,
    device_type,
    source,
    ip,
    os_name,
    hardware=None,
    installed_apps=None,
    agent_id=None,
):
    """Create a new device."""
    device = {
        "id": _next_id(),
        "name": name,
        "type": device_type,
        "source": source,
        "ip": ip,
        "os": os_name,
        "hardware": hardware or {},
        "installed_apps": installed_apps or [],
        "last_seen": datetime.utcnow().isoformat() + "Z",
        "agent_id": agent_id,
    }
    devices.append(device)
    return device


def get_device(device_id):
    """Get device by id."""
    for d in devices:
        if d["id"] == device_id:
            return d
    return None


def get_all_devices():
    """List all devices."""
    return [deepcopy(d) for d in devices]


def update_device(device_id, **kwargs):
    """Update device fields."""
    device = get_device(device_id)
    if not device:
        return None
    for k, v in kwargs.items():
        if k in device and v is not None:
            device[k] = v
    return device


def delete_device(device_id):
    """Remove device."""
    global devices
    device = get_device(device_id)
    if device:
        devices = [d for d in devices if d["id"] != device_id]
        return True
    return False


def create_threat_scan(device_ids, results):
    """Store a threat scan result."""
    scan = {
        "id": _next_id(),
        "device_ids": device_ids,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "status": "completed",
        "results": results,
    }
    threat_scans.append(scan)
    return scan


def get_all_threat_scans():
    """List all threat scans (newest first)."""
    return [deepcopy(s) for s in reversed(threat_scans)]
