"""Threat scan API - simulated CVE scraping with detailed reports."""

import random
import time
from flask import Blueprint, request, jsonify
from models import get_device, create_threat_scan, get_all_threat_scans

bp = Blueprint("threats", __name__)

SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]

# 10 CVE sources: (name, url_template)
CVE_SOURCES = [
    ("nvd.nist.gov", "https://nvd.nist.gov/vuln/detail/{cve_id}"),
    ("cve.mitre.org", "https://cve.mitre.org/cgi-bin/cvename.cgi?name={cve_id}"),
    ("exploit-db.com", "https://www.exploit-db.com/search?q={cve_id}"),
    ("vulners.com", "https://vulners.com/search?query={cve_id}"),
    ("packetstormsecurity.com", "https://packetstormsecurity.com/search/?q={cve_id}"),
    ("vulncode-db.com", "https://www.vulncode-db.com/{cve_id}"),
    ("securityfocus.com", "https://www.securityfocus.com/bid/{cve_id}"),
    ("redhat.com", "https://access.redhat.com/security/cve/{cve_id}"),
    ("snyk.io", "https://security.snyk.io/vuln/?q={cve_id}"),
    ("osv.dev", "https://osv.dev/list?q={cve_id}"),
]

SCAN_DURATION_SEC = 5

MOCK_THREATS = [
    "Buffer overflow allows remote code execution.",
    "Authentication bypass prior to patched version.",
    "Cross-site scripting vulnerability in web interface.",
    "Out-of-bounds read could lead to information disclosure.",
]


def _normalize_app(item):
    if isinstance(item, dict) and "name" in item:
        return {"name": item.get("name", ""), "version": str(item.get("version", ""))}
    s = str(item)
    if " " in s:
        parts = s.split(None, 1)
        return {"name": parts[0], "version": parts[1] if len(parts) > 1 else ""}
    return {"name": s, "version": ""}


def _random_latest_version(installed):
    if not installed or random.random() < 0.4:
        return installed or "—"
    parts = installed.replace("+", ".").split(".")
    if parts and parts[0].isdigit():
        n = int(parts[0]) + random.randint(0, 2)
        return f"{n}.0" if len(parts) == 1 else f"{n}.{parts[1]}" if len(parts) > 1 else str(n)
    return installed


def _maybe_threat(selected_sources):
    if random.random() < 0.25 and selected_sources:
        cve_id = f"CVE-2025-{random.randint(1000, 9999)}"
        source_name, source_url_tpl = random.choice(selected_sources)
        source_url = source_url_tpl.format(cve_id=cve_id)
        return {
            "cve_id": cve_id,
            "severity": random.choice(SEVERITIES),
            "description": random.choice(MOCK_THREATS),
            "source": source_name,
            "source_url": source_url,
        }
    return None


def _build_device_report(device, scan_software, scan_hardware, selected_sources):
    report = {
        "device_id": device["id"],
        "device_name": device.get("name", "unknown"),
        "software": [],
        "hardware": [],
    }

    if scan_software:
        apps = device.get("installed_apps") or []
        for item in apps:
            app = _normalize_app(item)
            inst_ver = app.get("version") or "—"
            latest = _random_latest_version(inst_ver) if inst_ver != "—" else "—"
            report["software"].append({
                "name": app.get("name", "?"),
                "installed_version": inst_ver,
                "latest_version": latest,
                "threat": _maybe_threat(selected_sources),
            })

    if scan_hardware:
        hw = device.get("hardware") or {}
        cpu = hw.get("cpu") or {}
        if cpu.get("model"):
            report["hardware"].append({
                "name": cpu.get("model", "CPU"),
                "installed_version": "current",
                "latest_version": "current",
                "threat": _maybe_threat(selected_sources),
            })
        if hw.get("ram_total_gb"):
            report["hardware"].append({
                "name": f"RAM ({hw.get('ram_total_gb')} GB)",
                "installed_version": "current",
                "latest_version": "current",
                "threat": None,
            })

    return report


def _run_detailed_scan(device_configs, cve_sites):
    """device_configs: [{device_id, scan_software, scan_hardware}, ...]"""
    name_to_tpl = {s[0]: s for s in CVE_SOURCES}
    selected_sources = [name_to_tpl[name] for name in (cve_sites or []) if name in name_to_tpl]
    if not selected_sources:
        selected_sources = [CVE_SOURCES[0]]  # default to NVD

    results = []
    for cfg in device_configs:
        device = get_device(cfg.get("device_id"))
        if not device:
            continue
        sw = cfg.get("scan_software", True)
        hw = cfg.get("scan_hardware", True)
        if not sw and not hw:
            continue
        results.append(_build_device_report(device, sw, hw, selected_sources))

    return results


@bp.route("/", methods=["GET"])
def list_scans():
    return jsonify(get_all_threat_scans())


@bp.route("/sources", methods=["GET"])
def list_cve_sources():
    """Return available CVE sites for selection."""
    return jsonify([{"id": s[0], "name": s[0]} for s in CVE_SOURCES])


@bp.route("/scan", methods=["POST"])
def scan():
    data = request.get_json() or {}
    device_configs = data.get("device_configs", [])
    cve_sites = data.get("cve_sites", [])

    if not device_configs:
        return jsonify({"error": "device_configs required"}), 400

    time.sleep(SCAN_DURATION_SEC)

    results = _run_detailed_scan(device_configs, cve_sites)
    device_ids = [c["device_id"] for c in device_configs]
    scan_record = create_threat_scan(device_ids, results)
    scan_record["device_configs"] = device_configs
    scan_record["cve_sites"] = cve_sites or [s[0] for s in CVE_SOURCES[:3]]
    return jsonify(scan_record), 201
