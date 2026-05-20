import { useState } from "react";
import { Map, Plus, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DashboardLayout from "@/layouts/DashboardLayout";
import StatusBadge from "@/components/shared/StatusBadge";
import { routes } from "@/data/mockData";

export default function RouteManagement() {
  const [open, setOpen] = useState(false);

  return (
    <DashboardLayout role="logistics" title="Route Management">
      <div className="p-6 space-y-5">
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-add-route"><Plus className="w-4 h-4" />Add Route</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create New Route</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div><Label>Route Name</Label><Input placeholder="e.g. Ilocos to Manila" className="mt-1" data-testid="input-route-name" /></div>
                <div><Label>Origin</Label><Input placeholder="Pickup location" className="mt-1" data-testid="input-origin" /></div>
                <div><Label>Destination</Label><Input placeholder="Delivery location" className="mt-1" data-testid="input-destination" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Distance (km)</Label><Input type="number" className="mt-1" data-testid="input-distance" /></div>
                  <div><Label>Est. Hours</Label><Input type="number" className="mt-1" data-testid="input-hours" /></div>
                </div>
                <Button className="w-full" onClick={() => setOpen(false)} data-testid="button-save-route">Save Route</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {routes.map((r) => (
            <Card key={r.id} className="border-card-border hover:shadow-sm transition-shadow" data-testid={`card-route-${r.id}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                      <Map className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{r.name}</p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span>{r.origin}</span>
                        <span>→</span>
                        <span>{r.destination}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Map className="w-3 h-3" />
                          <span>{r.distanceKm} km</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>~{r.estimatedHours}h</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">{r.assignedDrivers} drivers</Badge>
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
