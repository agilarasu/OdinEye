import { useState, useEffect, Fragment } from "react";
import { api } from "../api/client";
import AddDeviceModal from "./AddDeviceModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

const APPS_PREVIEW = 6;

function normalizeApp(item) {
  if (typeof item === "object" && item && "name" in item) {
    return { name: String(item.name), version: String(item.version || "") };
  }
  const s = String(item);
  const sp = s.indexOf(" ");
  return sp > 0 ? { name: s.slice(0, sp), version: s.slice(sp + 1) } : { name: s, version: "" };
}

function formatHardware(device) {
  const hw = device.hardware || {};
  const cpu = hw.cpu;
  const parts = [];
  if (cpu?.model) parts.push(cpu.model);
  if (hw.ram_total_gb) parts.push(`${hw.ram_total_gb} GB RAM`);
  return parts.length ? parts.join(" · ") : device.os || "—";
}

export default function DeviceList() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [appsFullyExpanded, setAppsFullyExpanded] = useState(new Set());

  const load = async () => {
    try {
      setError(null);
      const data = await api.devices.list();
      setDevices(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Remove this device?")) return;
    try {
      await api.devices.delete(id);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleEdit = (d) => {
    setEditing(d);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditing(null);
    load();
  };

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
    setAppsFullyExpanded((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const toggleAppsFully = (e, id) => {
    e.stopPropagation();
    setAppsFullyExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive text-sm">{error}</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Devices</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage campus and organization devices</p>
        </div>
        <Button onClick={() => setModalOpen(true)} size="lg">Add Device</Button>
      </div>

      {devices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground">No devices. Add one via agent or manual entry.</p>
            <Button className="mt-4" onClick={() => setModalOpen(true)}>Add Device</Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>OS</TableHead>
                <TableHead>Hardware</TableHead>
                <TableHead>Apps</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map((d) => {
                const isExpanded = expandedId === d.id;
                const rawApps = d.installed_apps || [];
                const apps = rawApps.map(normalizeApp);
                const showAll = appsFullyExpanded.has(d.id);
                const visibleApps = showAll ? apps : apps.slice(0, APPS_PREVIEW);
                const hasMore = apps.length > APPS_PREVIEW && !showAll;

                return (
                  <Fragment key={d.id}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() => toggleExpand(d.id)}
                    >
                      <TableCell>
                        <span className="text-muted-foreground text-xs">
                          {isExpanded ? "▼" : "▶"}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell>{d.type}</TableCell>
                      <TableCell>
                        <Badge variant={d.source === "agent" ? "default" : "secondary"}>
                          {d.source}
                        </Badge>
                      </TableCell>
                      <TableCell>{d.ip || "—"}</TableCell>
                      <TableCell>{d.os || "—"}</TableCell>
                      <TableCell>{formatHardware(d)}</TableCell>
                      <TableCell>{apps.length}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(d)}>
                          Edit
                        </Button>
                        <Button variant="destructive" size="sm" className="ml-2" onClick={() => handleDelete(d.id)}>
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={9} className="bg-muted/30 p-4">
                          <div className="pl-8">
                            <h4 className="text-sm font-medium mb-3">Installed Apps</h4>
                            {apps.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No apps recorded</p>
                            ) : (
                              <>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Name</TableHead>
                                      <TableHead>Version</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {visibleApps.map((app, i) => (
                                      <TableRow key={i}>
                                        <TableCell>{app.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{app.version || "—"}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                                {hasMore && (
                                  <Button variant="link" size="sm" className="mt-2 h-auto p-0" onClick={(e) => toggleAppsFully(e, d.id)}>
                                    +{apps.length - APPS_PREVIEW} more
                                  </Button>
                                )}
                                {showAll && apps.length > APPS_PREVIEW && (
                                  <Button variant="ghost" size="sm" className="mt-2 ml-2" onClick={(e) => toggleAppsFully(e, d.id)}>
                                    Show less
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {modalOpen && (
        <AddDeviceModal onClose={handleCloseModal} onSuccess={handleCloseModal} editing={editing} />
      )}
    </div>
  );
}
