import { useState, useEffect } from "react";
import { api } from "../api/client";
import NewScanDialog from "./NewScanDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

const SCAN_DURATION_MS = 5000;
const PROGRESS_STEPS = [
  "Connecting to devices...",
  "Scanning software components...",
  "Checking hardware & firmware...",
  "Querying CVE databases...",
  "Generating report...",
];

function SeverityBadge({ severity }) {
  const c = severity?.toUpperCase() || "";
  const variants = { critical: "destructive", high: "default", medium: "secondary", low: "outline" };
  return <Badge variant={variants[c.toLowerCase()] || "outline"}>{c || "—"}</Badge>;
}

function CveLink({ threat }) {
  if (!threat?.source_url) return <span>{threat?.cve_id}</span>;
  return (
    <a
      href={threat.source_url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-primary hover:underline"
    >
      {threat.cve_id}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

function isNewReportFormat(results) {
  if (!results?.length) return false;
  const first = results[0];
  return first && (Array.isArray(first.software) || Array.isArray(first.hardware));
}

export default function ThreatsPage() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanMessage, setScanMessage] = useState("");
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const load = async () => {
    try {
      setError(null);
      const data = await api.threats.list();
      setScans(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!scanning) return;
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / SCAN_DURATION_MS) * 100);
      const step = Math.min(
        PROGRESS_STEPS.length - 1,
        Math.floor((elapsed / SCAN_DURATION_MS) * PROGRESS_STEPS.length)
      );
      setScanProgress(pct);
      setScanMessage(PROGRESS_STEPS[step] || PROGRESS_STEPS[PROGRESS_STEPS.length - 1]);
    }, 400);
    return () => clearInterval(interval);
  }, [scanning]);

  const handleScanComplete = async (deviceConfigs, cveSites) => {
    setError(null);
    setScanning(true);
    setScanProgress(0);
    setScanMessage(PROGRESS_STEPS[0]);
    try {
      const newScan = await api.threats.scan(deviceConfigs, cveSites);
      await load();
      setExpanded(newScan?.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setScanning(false);
    }
  };

  const formatDate = (s) => {
    if (!s) return "—";
    try {
      return new Date(s).toLocaleString();
    } catch {
      return s;
    }
  };

  const renderDetailReport = (scan) => {
    const results = scan.results || [];
    if (!isNewReportFormat(results)) return null;

    return (
      <div className="space-y-8">
        {results.map((dev) => (
          <div key={dev.device_id}>
            <h4 className="text-lg font-semibold mb-4">{dev.device_name}</h4>
            {dev.software?.length > 0 && (
              <div className="mb-6">
                <h5 className="text-sm font-medium text-muted-foreground mb-2">Software</h5>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Installed</TableHead>
                      <TableHead>Latest</TableHead>
                      <TableHead>Threat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dev.software.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell>{s.name}</TableCell>
                        <TableCell>{s.installed_version}</TableCell>
                        <TableCell>{s.latest_version}</TableCell>
                        <TableCell>
                          {s.threat ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <CveLink threat={s.threat} />
                                <SeverityBadge severity={s.threat.severity} />
                              </div>
                              <p className="text-xs text-muted-foreground">{s.threat.description}</p>
                            </div>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {dev.hardware?.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-muted-foreground mb-2">Hardware</h5>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Installed</TableHead>
                      <TableHead>Latest</TableHead>
                      <TableHead>Threat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dev.hardware.map((h, i) => (
                      <TableRow key={i}>
                        <TableCell>{h.name}</TableCell>
                        <TableCell>{h.installed_version}</TableCell>
                        <TableCell>{h.latest_version}</TableCell>
                        <TableCell>
                          {h.threat ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <CveLink threat={h.threat} />
                                <SeverityBadge severity={h.threat.severity} />
                              </div>
                              <p className="text-xs text-muted-foreground">{h.threat.description}</p>
                            </div>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderLegacyReport = (scan) => {
    const results = scan.results || [];
    if (isNewReportFormat(results)) return null;
    if (results.length === 0) return <p className="text-sm text-muted-foreground py-4">No findings.</p>;

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>CVE ID</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Affected</TableHead>
            <TableHead>Source</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((r, i) => (
            <TableRow key={i}>
              <TableCell>
                {(r.source_url || r.cve_id) ? (
                  <a
                    href={r.source_url || `https://nvd.nist.gov/vuln/detail/${r.cve_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    {r.cve_id}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  r.cve_id
                )}
              </TableCell>
              <TableCell><SeverityBadge severity={r.severity} /></TableCell>
              <TableCell>{r.description}</TableCell>
              <TableCell>{r.affected_product}</TableCell>
              <TableCell>{r.source}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Threat Scan</h2>
          <p className="text-sm text-muted-foreground mt-1">Run CVE scans on selected devices</p>
        </div>
        <NewScanDialog
          onScanComplete={handleScanComplete}
          scanning={scanning}
          trigger={
            <Button size="lg" disabled={scanning}>
              {scanning ? "Scanning..." : "New Scan"}
            </Button>
          }
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {scanning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <Card className="w-full max-w-sm">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <p className="text-sm font-medium">{scanMessage}</p>
                <Progress value={scanProgress} className="w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold mb-4">Scan History</h3>
        {scans.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No scans yet. Click New Scan to configure and run a scan.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {scans.map((scan) => (
              <Card key={scan.id}>
                <button
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors rounded-lg"
                  onClick={() => setExpanded(expanded === scan.id ? null : scan.id)}
                >
                  <span className="font-medium">{formatDate(scan.timestamp)}</span>
                  <span className="text-sm text-muted-foreground">
                    {scan.device_ids?.length || 0} device(s)
                    {scan.cve_sites?.length ? ` · ${scan.cve_sites.length} CVE source(s)` : ""}
                  </span>
                  {expanded === scan.id ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                </button>
                {expanded === scan.id && (
                  <CardContent className="pt-0 border-t">
                    {renderDetailReport(scan) || renderLegacyReport(scan)}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
