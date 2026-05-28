import { useState } from "react";
import { Search, UserPlus, Star, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayout from "@/layouts/DashboardLayout";
import StatusBadge from "@/components/shared/StatusBadge";
import { drivers } from "@/data/mockData";

export default function DriverManagement() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = drivers.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()) || d.plateNumber.toLowerCase().includes(search.toLowerCase()));

  return (
    <DashboardLayout role="logistics" title="Driver Management">
      <div className="p-6 space-y-5">
        <div className="flex gap-3 justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search drivers..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-search" />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-add-driver"><UserPlus className="w-4 h-4" />Add Driver</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add New Driver</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div><Label>Full Name</Label><Input placeholder="Juan dela Cruz" className="mt-1" data-testid="input-driver-name" /></div>
                <div><Label>Phone Number</Label><Input placeholder="09171234567" className="mt-1" data-testid="input-driver-phone" /></div>
                <div><Label>Vehicle Type</Label>
                  <Select><SelectTrigger className="mt-1"><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                    <SelectContent>
                      {["Multicab", "L300 Van", "Elf Truck", "Motorcycle"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Plate Number</Label><Input placeholder="ABC-1234" className="mt-1" data-testid="input-plate-number" /></div>
                <div><Label>Operating Region</Label><Input placeholder="Metro Manila" className="mt-1" data-testid="input-region" /></div>
                <Button className="w-full" onClick={() => setOpen(false)} data-testid="button-save-driver">Add Driver</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((d) => (
            <Card key={d.id} className="border-card-border hover:shadow-md transition-shadow" data-testid={`card-driver-${d.id}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-secondary/10 flex items-center justify-center text-sm font-bold text-secondary">
                    {d.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <StatusBadge status={d.status} />
                </div>
                <p className="font-bold text-foreground">{d.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">{d.phone}</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-muted rounded-lg p-2">
                    <p className="text-muted-foreground">Vehicle</p>
                    <p className="font-semibold text-foreground mt-0.5">{d.vehicle}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-2">
                    <p className="text-muted-foreground">Plate</p>
                    <p className="font-semibold text-foreground mt-0.5">{d.plateNumber}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-2">
                    <p className="text-muted-foreground">Today</p>
                    <p className="font-semibold text-foreground mt-0.5">{d.deliveriesToday} deliveries</p>
                  </div>
                  <div className="bg-muted rounded-lg p-2">
                    <p className="text-muted-foreground">Rating</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star className="w-3 h-3 fill-accent text-accent" />
                      <p className="font-semibold text-foreground">{d.rating}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
