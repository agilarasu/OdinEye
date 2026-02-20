import { useState, useEffect } from "react";
import { api } from "../api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export default function DeviceSelector({ selected, onChange }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.devices.list().then(setDevices).finally(() => setLoading(false));
  }, []);

  const toggle = (id) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const toggleAll = () => {
    if (selected.length === devices.length) {
      onChange([]);
    } else {
      onChange(devices.map((d) => d.id));
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-4 w-48 mb-4" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center space-x-2 mb-4">
          <Checkbox
            id="select-all"
            checked={devices.length > 0 && selected.length === devices.length}
            onCheckedChange={toggleAll}
          />
          <Label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
            Select devices to scan
          </Label>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {devices.map((d) => (
            <div key={d.id} className="flex items-center space-x-2">
              <Checkbox
                id={d.id}
                checked={selected.includes(d.id)}
                onCheckedChange={() => toggle(d.id)}
              />
              <Label htmlFor={d.id} className="flex flex-col cursor-pointer text-sm font-normal">
                <span className="font-medium">{d.name}</span>
                <span className="text-muted-foreground text-xs">{d.type} · {d.os || "—"}</span>
              </Label>
            </div>
          ))}
        </div>
        {devices.length === 0 && (
          <p className="text-sm text-muted-foreground py-4">No devices. Add devices first.</p>
        )}
      </CardContent>
    </Card>
  );
}
