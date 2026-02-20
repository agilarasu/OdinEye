import { useState, useEffect } from "react";
import { api } from "../api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const [devices, setDevices] = useState([]);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.devices.list(), api.threats.list()])
      .then(([devs, s]) => {
        setDevices(devs);
        setScans(s);
      })
      .finally(() => setLoading(false));
  }, []);

  const byType = devices.reduce((acc, d) => {
    acc[d.type] = (acc[d.type] || 0) + 1;
    return acc;
  }, {});

  const totalFindings = scans.reduce((sum, s) => sum + (s.results?.length || 0), 0);
  const severityCounts = scans.reduce((acc, s) => {
    const results = s.results || [];
    const isNew = results[0] && (results[0].software || results[0].hardware);
    if (isNew) {
      results.forEach((dev) => {
        [...(dev.software || []), ...(dev.hardware || [])].forEach((item) => {
          const t = item.threat;
          if (t) {
            const sev = (t.severity || "low").toLowerCase();
            acc[sev] = (acc[sev] || 0) + 1;
          }
        });
      });
    } else {
      results.forEach((r) => {
        const sev = (r.severity || "low").toLowerCase();
        acc[sev] = (acc[sev] || 0) + 1;
      });
    }
    return acc;
  }, {});

  const recentScans = scans.slice(0, 5);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">Security overview across devices and threats</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-primary">{devices.length}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Scans Run</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">{scans.length}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Findings</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">{totalFindings}</span>
          </CardContent>
        </Card>
        <Card className="border-destructive/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-destructive">{severityCounts.critical || 0}</span>
          </CardContent>
        </Card>
        <Card className="border-amber-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">High</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-amber-500">{severityCounts.high || 0}</span>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Devices by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(byType).length === 0 ? (
              <p className="text-sm text-muted-foreground">No devices yet</p>
            ) : (
              <ul className="space-y-2">
                {Object.entries(byType).map(([type, count]) => (
                  <li key={type} className="flex justify-between text-sm">
                    <span className="capitalize">{type.replace("-", " ")}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Scans</CardTitle>
          </CardHeader>
          <CardContent>
            {recentScans.length === 0 ? (
              <p className="text-sm text-muted-foreground">No scans yet</p>
            ) : (
              <ul className="space-y-2">
                {recentScans.map((s) => (
                  <li key={s.id} className="flex justify-between text-sm">
                    <span>{s.timestamp ? new Date(s.timestamp).toLocaleDateString() : "—"}</span>
                    <span className="text-muted-foreground">
                      {s.device_ids?.length || 0} device(s)
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
