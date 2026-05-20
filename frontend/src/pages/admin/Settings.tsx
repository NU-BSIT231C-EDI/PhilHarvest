import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Settings, Save, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import DashboardLayout from "@/layouts/DashboardLayout";
import { systemSettings } from "@/data/mockData";

const schema = z.object({
  platformName: z.string().min(2),
  platformEmail: z.string().email(),
  platformPhone: z.string().min(8),
  commissionRate: z.coerce.number().min(0).max(100),
});

export default function SystemSettings() {
  const [maintenanceMode, setMaintenanceMode] = useState(systemSettings.maintenanceMode);
  const [allowRegistrations, setAllowRegistrations] = useState(systemSettings.allowNewRegistrations);
  const [requireVerification, setRequireVerification] = useState(systemSettings.requireSellerVerification);
  const [saved, setSaved] = useState(false);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      platformName: systemSettings.platformName,
      platformEmail: systemSettings.platformEmail,
      platformPhone: systemSettings.platformPhone,
      commissionRate: systemSettings.commissionRate,
    },
  });

  return (
    <DashboardLayout role="admin" title="System Settings">
      <div className="p-6 space-y-5 max-w-2xl">
        {saved && (
          <div className="bg-secondary/10 text-secondary border border-secondary/20 rounded-lg px-4 py-2.5 text-sm font-medium" data-testid="text-saved">
            Settings saved successfully!
          </div>
        )}

        {maintenanceMode && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Maintenance Mode is ON</p>
              <p className="text-xs text-amber-700 mt-0.5">The platform is currently in maintenance mode. Only admins can access it.</p>
            </div>
          </div>
        )}

        {/* Platform Info */}
        <Card className="border-card-border">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Settings className="w-4 h-4" />Platform Information</CardTitle></CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(() => setSaved(true))} className="space-y-4">
                <FormField control={form.control} name="platformName" render={({ field }) => (
                  <FormItem><FormLabel>Platform Name</FormLabel><FormControl><Input {...field} data-testid="input-platform-name" /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="platformEmail" render={({ field }) => (
                    <FormItem><FormLabel>Support Email</FormLabel><FormControl><Input type="email" {...field} data-testid="input-platform-email" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="platformPhone" render={({ field }) => (
                    <FormItem><FormLabel>Support Phone</FormLabel><FormControl><Input {...field} data-testid="input-platform-phone" /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="commissionRate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commission Rate (%)</FormLabel>
                    <FormControl><Input type="number" min={0} max={100} step={0.5} className="max-w-[120px]" {...field} data-testid="input-commission-rate" /></FormControl>
                    <p className="text-xs text-muted-foreground">Percentage taken from each transaction</p>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="gap-2" data-testid="button-save-settings"><Save className="w-4 h-4" />Save Settings</Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Feature Toggles */}
        <Card className="border-card-border">
          <CardHeader><CardTitle className="text-base">Feature Controls</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <div>
                <p className="text-sm font-semibold text-foreground">Maintenance Mode</p>
                <p className="text-xs text-muted-foreground">Restrict access to admins only</p>
              </div>
              <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} data-testid="switch-maintenance-mode" />
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <div>
                <p className="text-sm font-semibold text-foreground">Allow New Registrations</p>
                <p className="text-xs text-muted-foreground">Enable new user sign-ups</p>
              </div>
              <Switch checked={allowRegistrations} onCheckedChange={setAllowRegistrations} data-testid="switch-allow-registrations" />
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-semibold text-foreground">Require Seller Verification</p>
                <p className="text-xs text-muted-foreground">Sellers must be manually verified before listing</p>
              </div>
              <Switch checked={requireVerification} onCheckedChange={setRequireVerification} data-testid="switch-require-verification" />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
