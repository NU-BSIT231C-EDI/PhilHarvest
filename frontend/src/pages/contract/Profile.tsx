import { useState } from "react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building2, CheckCircle, Save } from "lucide-react";
import { users } from "@/data/mockData";

export default function ContractProfile() {
  const user = users.find((u) => u.id === "u8")!;
  const [form, setForm] = useState({
    companyName: user.companyName || "FreshMart Philippines Inc.",
    name: user.name,
    email: user.email,
    phone: user.phone || "02-88001234",
    address: user.address || "5F Tower 1, BGC, Taguig",
    region: user.region || "Metro Manila",
  });

  return (
    <DashboardLayout role="contract" title="Company Profile">
      <div className="p-6 max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center">
            <Building2 className="w-8 h-8 text-purple-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-foreground">{form.companyName}</h2>
              {user.verified && (
                <Badge className="bg-green-100 text-green-700 border-green-200 gap-1 text-xs">
                  <CheckCircle className="w-3 h-3" /> Verified
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">Contract Buyer Account · Member since {user.joinedDate}</p>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Company Information</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Company Name</Label>
              <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} data-testid="input-company-name" />
            </div>
            <div className="space-y-1.5">
              <Label>Contact Person</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-contact-name" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="input-email" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="input-phone" />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Business Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} data-testid="input-address" />
            </div>
            <div className="space-y-1.5">
              <Label>Region</Label>
              <Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} data-testid="input-region" />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button className="gap-2" data-testid="button-save-profile">
            <Save className="w-4 h-4" /> Save Changes
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
