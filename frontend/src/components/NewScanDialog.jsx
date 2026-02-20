import { useState, useEffect } from "react";
import { api } from "../api/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Cpu, HardDrive } from "lucide-react";

const DEFAULT_CVE_SOURCES = [
    "nvd.nist.gov", "cve.mitre.org", "exploit-db.com", "vulners.com",
    "packetstormsecurity.com", "vulncode-db.com", "securityfocus.com",
    "redhat.com", "snyk.io", "osv.dev"
].map((id) => ({ id, name: id }));

export default function NewScanDialog({ onScanComplete, scanning, trigger }) {
  const [open, setOpen] = useState(false);
  const [devices, setDevices] = useState([]);
  const [cveSources, setCveSources] = useState(DEFAULT_CVE_SOURCES);
  const [deviceConfigs, setDeviceConfigs] = useState({});
  const [selectedCveSites, setSelectedCveSites] = useState(new Set());

  useEffect(() => {
    api.devices.list().then(setDevices);
    api.threats.sources().then(setCveSources).catch(() => setCveSources(DEFAULT_CVE_SOURCES));
  }, []);

  useEffect(() => {
    const init = {};
    devices.forEach((d) => {
      init[d.id] = { scan_software: true, scan_hardware: true };
    });
    setDeviceConfigs((prev) => ({ ...init, ...prev }));
  }, [devices]);

  useEffect(() => {
    setSelectedCveSites(new Set(cveSources.map((s) => s.id)));
  }, [cveSources]);

  const setDeviceOption = (deviceId, key, value) => {
    setDeviceConfigs((prev) => ({
      ...prev,
      [deviceId]: { ...(prev[deviceId] || {}), [key]: value },
    }));
  };

  const toggleCveSite = (id) => {
    setSelectedCveSites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllCve = () => {
    setSelectedCveSites(new Set(cveSources.map((s) => s.id)));
  };

  const handleRunScan = () => {
    const configs = devices
      .map((d) => ({
        device_id: d.id,
        scan_software: deviceConfigs[d.id]?.scan_software ?? true,
        scan_hardware: deviceConfigs[d.id]?.scan_hardware ?? true,
      }))
      .filter((c) => c.scan_software || c.scan_hardware);

    if (configs.length === 0) {
      return;
    }
    if (selectedCveSites.size === 0) {
      return;
    }
    onScanComplete(configs, Array.from(selectedCveSites));
    setOpen(false);
  };

  const hasAnySelected = devices.some(
    (d) => deviceConfigs[d.id]?.scan_software || deviceConfigs[d.id]?.scan_hardware
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>New Threat Scan</DialogTitle>
          <DialogDescription>
            Select devices, per-device scan type (software/hardware), and CVE sources.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4 md:grid-cols-2">
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Devices & scan type</Label>
            <ScrollArea className="h-[240px] rounded-md border p-3">
              <div className="space-y-3">
                {devices.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">No devices. Add devices first.</p>
                ) : (
                  devices.map((d) => (
                    <div
                      key={d.id}
                      className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3"
                    >
                      <div className="font-medium text-sm">{d.name}</div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`${d.id}-sw`}
                            checked={deviceConfigs[d.id]?.scan_software ?? true}
                            onCheckedChange={(c) => setDeviceOption(d.id, "scan_software", !!c)}
                          />
                          <Label htmlFor={`${d.id}-sw`} className="flex items-center gap-1.5 text-sm font-normal cursor-pointer">
                            <Cpu className="h-4 w-4" />
                            Software
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`${d.id}-hw`}
                            checked={deviceConfigs[d.id]?.scan_hardware ?? true}
                            onCheckedChange={(c) => setDeviceOption(d.id, "scan_hardware", !!c)}
                          />
                          <Label htmlFor={`${d.id}-hw`} className="flex items-center gap-1.5 text-sm font-normal cursor-pointer">
                            <HardDrive className="h-4 w-4" />
                            Hardware
                          </Label>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">CVE sources</Label>
              <Button variant="ghost" size="sm" onClick={selectAllCve}>
                Select all
              </Button>
            </div>
            <ScrollArea className="h-[240px] rounded-md border p-3">
              <div className="space-y-2">
                {cveSources.map((s) => (
                  <div key={s.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`cve-${s.id}`}
                      checked={selectedCveSites.has(s.id)}
                      onCheckedChange={() => toggleCveSite(s.id)}
                    />
                    <Label htmlFor={`cve-${s.id}`} className="text-sm font-normal cursor-pointer flex-1">
                      {s.name}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleRunScan}
            disabled={scanning || !hasAnySelected || selectedCveSites.size === 0}
          >
            Run Scan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
