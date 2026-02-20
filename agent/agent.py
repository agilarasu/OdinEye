#!/usr/bin/env python3
"""
CISO Device Management Agent.
Collects hardware (CPU, RAM) and installed apps, registers via HTTP to Flask backend.
"""

import platform
import socket
import subprocess
import sys
from typing import Optional

try:
    import psutil
    import requests
except ImportError:
    print("Install dependencies: pip install requests psutil")
    sys.exit(1)


def get_hostname() -> str:
    return platform.node() or "unknown"


def get_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return ""


def get_os() -> str:
    return f"{platform.system()} {platform.release()}"


def get_cpu_info() -> dict:
    """Get CPU model and cores via psutil or platform."""
    try:
        import os
        cores = os.cpu_count() or 1
    except Exception:
        cores = 1

    model = "Unknown"
    try:
        if platform.system() == "Linux":
            with open("/proc/cpuinfo", "r") as f:
                for line in f:
                    if "model name" in line:
                        model = line.split(":")[-1].strip()
                        break
        elif platform.system() == "Windows":
            out = subprocess.check_output(
                ["wmic", "cpu", "get", "name"],
                creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0,
            )
            lines = out.decode().strip().split("\n")
            if len(lines) >= 2:
                model = lines[1].strip()
        elif platform.system() == "Darwin":
            out = subprocess.check_output(["sysctl", "-n", "machdep.cpu.brand_string"])
            model = out.decode().strip()
    except Exception:
        model = platform.processor() or "Unknown"

    return {"model": model, "cores": cores}


def get_ram_info() -> dict:
    """Get RAM total and used in GB via psutil."""
    try:
        mem = psutil.virtual_memory()
        ram_total_gb = round(mem.total / (1024**3), 2)
        ram_used_gb = round(mem.used / (1024**3), 2)
        return {"ram_total_gb": ram_total_gb, "ram_used_gb": ram_used_gb}
    except Exception:
        return {"ram_total_gb": 0, "ram_used_gb": 0}


def get_installed_apps() -> list:
    """Platform-specific installed app enumeration. Returns [{ name, version }]."""
    apps = []
    seen = set()
    try:
        if platform.system() == "Linux":
            for cmd in [["dpkg", "-l"], ["rpm", "-qa", "--queryformat", "%{NAME}\t%{VERSION}\n"]]:
                try:
                    out = subprocess.check_output(cmd, stderr=subprocess.DEVNULL, timeout=10)
                    lines = out.decode().split("\n")
                    start = 5 if cmd[0] == "dpkg" else 0
                    for line in lines[start:start + 300]:
                        if cmd[0] == "dpkg":
                            parts = line.split()
                            if len(parts) >= 3:
                                pkg = parts[1]
                                if ":" in pkg:
                                    pkg = pkg.split(":")[0]
                                ver = parts[2]
                                if not pkg.startswith("lib") and pkg not in seen:
                                    seen.add(pkg)
                                    apps.append({"name": pkg, "version": ver})
                        else:
                            parts = line.split("\t", 1)
                            if len(parts) >= 2:
                                pkg, ver = parts[0].strip(), parts[1].strip()
                                if pkg and pkg not in seen:
                                    seen.add(pkg)
                                    apps.append({"name": pkg, "version": ver})
                    if apps:
                        break
                except (subprocess.CalledProcessError, FileNotFoundError):
                    continue
            if not apps:
                try:
                    out = subprocess.check_output(["rpm", "-qa"], stderr=subprocess.DEVNULL, timeout=5)
                    for line in out.decode().split("\n")[:50]:
                        if "-" in line:
                            parts = line.rsplit("-", 2)
                            if len(parts) >= 2:
                                pkg, ver = parts[0], "-".join(parts[1:])
                                if pkg not in seen:
                                    seen.add(pkg)
                                    apps.append({"name": pkg, "version": ver})
                except (subprocess.CalledProcessError, FileNotFoundError):
                    pass
        elif platform.system() == "Windows":
            try:
                flags = getattr(subprocess, "CREATE_NO_WINDOW", 0) if sys.platform == "win32" else 0
                out = subprocess.check_output(
                    ["wmic", "product", "get", "name"],
                    creationflags=flags,
                    timeout=15,
                )
                names = [
                    n.strip() for n in out.decode("utf-16-le", errors="ignore").split("\n")
                    if n.strip() and n.strip().lower() != "name"
                ]
                for n in names[:50]:
                    apps.append({"name": n, "version": ""})
            except Exception:
                pass
        elif platform.system() == "Darwin":
            try:
                out = subprocess.check_output(
                    ["ls", "/Applications"], stderr=subprocess.DEVNULL, timeout=5
                )
                for n in out.decode().split("\n")[:50]:
                    if n.strip().endswith(".app"):
                        name = n.replace(".app", "").strip()
                        apps.append({"name": name, "version": ""})
            except Exception:
                pass
    except Exception:
        pass

    if not apps:
        apps = [{"name": "(Unable to enumerate)", "version": ""}]
    return apps


def collect_and_register(backend_url: str) -> bool:
    """Collect system info and POST to backend."""
    cpu = get_cpu_info()
    ram = get_ram_info()
    hardware = {
        "cpu": cpu,
        "ram_total_gb": ram["ram_total_gb"],
        "ram_used_gb": ram["ram_used_gb"],
    }
    payload = {
        "hostname": get_hostname(),
        "ip": get_ip(),
        "os": get_os(),
        "hardware": hardware,
        "installed_apps": get_installed_apps(),
    }
    try:
        r = requests.post(
            f"{backend_url.rstrip('/')}/api/agents/register",
            json=payload,
            timeout=10,
        )
        r.raise_for_status()
        print("Registered successfully:", r.json().get("name", "unknown"))
        return True
    except requests.RequestException as e:
        print("Registration failed:", e)
        return False


def main():
    backend_url = "http://127.0.0.1:5000"
    if len(sys.argv) > 1:
        backend_url = sys.argv[1]
    success = collect_and_register(backend_url)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
