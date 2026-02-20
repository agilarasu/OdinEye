const API_BASE = "http://127.0.0.1:5000";

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

export const api = {
  devices: {
    list: () => request("/api/devices/"),
    create: (body) => request("/api/devices/", { method: "POST", body: JSON.stringify(body) }),
    update: (id, body) => request(`/api/devices/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    delete: (id) => request(`/api/devices/${id}`, { method: "DELETE" }),
  },
  threats: {
    list: () => request("/api/threats/"),
    sources: () => request("/api/threats/sources"),
    scan: (deviceConfigs, cveSites = []) =>
      request("/api/threats/scan", {
        method: "POST",
        body: JSON.stringify({ device_configs: deviceConfigs, cve_sites: cveSites }),
      }),
  },
};
