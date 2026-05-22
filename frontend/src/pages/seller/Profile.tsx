import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardLayout from "@/layouts/DashboardLayout";

const schema = z.object({
  farmName: z.string().min(2),
  ownerName: z.string().min(2),
  province: z.string().min(2),
  region: z.string().min(2),
  description: z.string().min(10),
  phone: z.string().min(10),
  email: z.string().email(),
});

export default function SellerProfile() {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { farmName: "Santos Family Farm", ownerName: "Jose Santos", province: "Benguet", region: "CAR (Cordillera Administrative Region)", description: "Third-generation vegetable farmer in the highlands of Benguet. Specializing in cold-climate vegetables.", phone: "09171234567", email: "jose.santos@philharvest.ph" },
  });

  return (
    <DashboardLayout role="seller" title="Farm Profile Settings">
      <div className="p-6 max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(() => alert("Profile updated! (demo)"))} className="space-y-5">
            <Card className="border-card-border">
              <CardHeader><CardTitle className="text-base">Farm Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="farmName" render={({ field }) => (
                  <FormItem><FormLabel>Farm Name</FormLabel><FormControl><Input {...field} data-testid="input-farm-name" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="ownerName" render={({ field }) => (
                  <FormItem><FormLabel>Owner / Farmer Name</FormLabel><FormControl><Input {...field} data-testid="input-owner-name" /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="province" render={({ field }) => (
                    <FormItem><FormLabel>Province</FormLabel><FormControl><Input {...field} data-testid="input-province" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="region" render={({ field }) => (
                    <FormItem><FormLabel>Region</FormLabel><FormControl><Input {...field} data-testid="input-region" /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Farm Description</FormLabel><FormControl><Textarea rows={4} {...field} data-testid="textarea-description" /></FormControl><FormMessage /></FormItem>
                )} />
              </CardContent>
            </Card>
            <Card className="border-card-border">
              <CardHeader><CardTitle className="text-base">Contact Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input {...field} data-testid="input-phone" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" {...field} data-testid="input-email" /></FormControl><FormMessage /></FormItem>
                )} />
              </CardContent>
            </Card>
            <Button type="submit" className="gap-2" data-testid="button-save-profile"><Save className="w-4 h-4" />Save Changes</Button>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}
