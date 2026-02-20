import { useState, useEffect } from "react";
import { api } from "../api/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DEVICE_TYPES = ["workstation", "laptop", "smart-board", "cctv", "iot"];
const TAB_AGENT = "agent";
const TAB_MANUAL = "manual";

export default function AddDeviceModal({ onClose, onSuccess, editing }) {
  const [tab, setTab] = useState(editing ? TAB_MANUAL : TAB_AGENT);
  const [form, setForm] = useState({
    name: "",
    type: "workstation",
    ip: "",
    os: "",
    cpu: "",
    ram_gb: "",
    installed_apps: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [backendUrl, setBackendUrl] = useState("http://127.0.0.1:5000");

  useEffect(() => {
    if (editing) {
      const hw = editing.hardware || {};
      const cpu = hw.cpu || {};
      const apps = (editing.installed_apps || []).map((a) =>
        typeof a === "object" && a?.name
          ? a.version ? `${a.name} ${a.version}` : a.name
          : String(a)
      );
      setForm({
        name: editing.name || "",
        type: editing.type || "workstation",
        ip: editing.ip || "",
        os: editing.os || "",
        cpu: cpu.model || hw.cpu || "",
        ram_gb: String(hw.ram_total_gb ?? hw.ram_gb ?? ""),
        installed_apps: apps.join(", "),
      });
      setTab(TAB_MANUAL);
    }
  }, [editing]);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const parseApps = (s) =>
    s
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        type: form.type,
        ip: form.ip,
        os: form.os,
        hardware: {
          cpu: form.cpu ? { model: form.cpu, cores: null } : {},
          ram_total_gb: form.ram_gb ? parseFloat(form.ram_gb) : null,
          ram_used_gb: null,
        },
        installed_apps: parseApps(form.installed_apps),
      };
      if (editing) {
        await api.devices.update(editing.id, payload);
      } else {
        await api.devices.create(payload);
      }
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const agentCommand = `python3 agent/agent.py ${backendUrl}`;
  const curlCommand = `curl -X POST ${backendUrl}/api/agents/register -H "Content-Type: application/json" -d '{"hostname":"MY-PC","ip":"192.168.1.1","os":"Windows 11","hardware":{"cpu":{"model":"Intel i7","cores":8},"ram_total_gb":16,"ram_used_gb":4},"installed_apps":["Chrome","VS Code"]}'`;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Device" : "Add Device"}</DialogTitle>
          <DialogDescription>
            {editing ? "Update device details below." : "Add a device via agent or manual entry."}
          </DialogDescription>
        </DialogHeader>

        {!editing && (
          <div className="flex border-b">
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === TAB_AGENT ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setTab(TAB_AGENT)}
            >
              Agent Installation
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === TAB_MANUAL ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setTab(TAB_MANUAL)}
            >
              Manual Entry
            </button>
          </div>
        )}

        {tab === TAB_AGENT && !editing ? (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">Run the Python agent on the device to register it automatically.</p>
            <div className="space-y-2">
              <Label htmlFor="backend-url">Backend URL</Label>
              <Input
                id="backend-url"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                placeholder="http://127.0.0.1:5000"
              />
            </div>
            <div className="rounded-md border bg-muted/50 p-3">
              <code className="text-xs break-all">{agentCommand}</code>
            </div>
            <p className="text-xs text-muted-foreground">Or use curl (replace values with actual data):</p>
            <div className="rounded-md border bg-muted/50 p-3 overflow-x-auto">
              <code className="text-xs break-all">{curlCommand}</code>
            </div>
            <p className="text-xs text-muted-foreground">After running, refresh the devices list to see the new device.</p>
          </div>
        ) : (
          <form onSubmit={handleManualSubmit} className="space-y-4 py-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} required placeholder="e.g. Lab-PC-01" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={form.type} onValueChange={(v) => update("type", v)}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEVICE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ip">IP</Label>
              <Input id="ip" value={form.ip} onChange={(e) => update("ip", e.target.value)} placeholder="192.168.1.10" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="os">OS</Label>
              <Input id="os" value={form.os} onChange={(e) => update("os", e.target.value)} placeholder="e.g. Windows 11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpu">CPU</Label>
              <Input id="cpu" value={form.cpu} onChange={(e) => update("cpu", e.target.value)} placeholder="e.g. Intel Core i7-12700" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ram">RAM (GB)</Label>
              <Input id="ram" type="number" min="0" step="0.5" value={form.ram_gb} onChange={(e) => update("ram_gb", e.target.value)} placeholder="16" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apps">Installed apps (comma-separated)</Label>
              <Input id="apps" value={form.installed_apps} onChange={(e) => update("installed_apps", e.target.value)} placeholder="Chrome, VS Code, Slack" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : editing ? "Update" : "Add Device"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
