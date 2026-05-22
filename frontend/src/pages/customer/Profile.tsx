import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, MapPin, Lock, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/layouts/DashboardLayout";

const profileSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
});

const addressSchema = z.object({
  street: z.string().min(5),
  city: z.string().min(2),
  province: z.string().min(2),
  zipCode: z.string().min(4),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(8),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });

export default function CustomerProfile() {
  const [saved, setSaved] = useState("");

  const profileForm = useForm({ resolver: zodResolver(profileSchema), defaultValues: { firstName: "Ana", lastName: "Reyes", email: "ana.reyes@email.com", phone: "09171234567" } });
  const addressForm = useForm({ resolver: zodResolver(addressSchema), defaultValues: { street: "123 Roxas Blvd", city: "Pasay City", province: "Metro Manila", zipCode: "1300" } });
  const passwordForm = useForm({ resolver: zodResolver(passwordSchema), defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" } });

  return (
    <DashboardLayout role="customer" title="Profile Settings">
      <div className="p-6 space-y-5">
        {/* Avatar */}
        <Card className="border-card-border">
          <CardContent className="p-5 flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">AR</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-bold text-foreground">Ana Reyes</p>
              <p className="text-sm text-muted-foreground">Customer · Member since June 2023</p>
              <Button size="sm" variant="outline" className="mt-2" data-testid="button-change-photo">Change Photo</Button>
            </div>
          </CardContent>
        </Card>

        {saved && <div className="bg-secondary/10 text-secondary border border-secondary/20 rounded-lg px-4 py-2.5 text-sm font-medium" data-testid="text-saved">{saved} saved successfully!</div>}

        <Tabs defaultValue="personal">
          <TabsList className="mb-4">
            <TabsTrigger value="personal" className="gap-2"><User className="w-3.5 h-3.5" />Personal Info</TabsTrigger>
            <TabsTrigger value="address" className="gap-2"><MapPin className="w-3.5 h-3.5" />Address</TabsTrigger>
            <TabsTrigger value="password" className="gap-2"><Lock className="w-3.5 h-3.5" />Password</TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <Card className="border-card-border">
              <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(() => setSaved("Personal info"))} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={profileForm.control} name="firstName" render={({ field }) => (
                        <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} data-testid="input-first-name" /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={profileForm.control} name="lastName" render={({ field }) => (
                        <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} data-testid="input-last-name" /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <FormField control={profileForm.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" {...field} data-testid="input-email" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={profileForm.control} name="phone" render={({ field }) => (
                      <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input {...field} data-testid="input-phone" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <Button type="submit" className="gap-2" data-testid="button-save-profile"><Save className="w-4 h-4" />Save Changes</Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="address">
            <Card className="border-card-border">
              <CardHeader><CardTitle className="text-base">Delivery Address</CardTitle></CardHeader>
              <CardContent>
                <Form {...addressForm}>
                  <form onSubmit={addressForm.handleSubmit(() => setSaved("Address"))} className="space-y-4">
                    <FormField control={addressForm.control} name="street" render={({ field }) => (
                      <FormItem><FormLabel>Street Address</FormLabel><FormControl><Input {...field} data-testid="input-street" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={addressForm.control} name="city" render={({ field }) => (
                        <FormItem><FormLabel>City / Municipality</FormLabel><FormControl><Input {...field} data-testid="input-city" /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={addressForm.control} name="province" render={({ field }) => (
                        <FormItem><FormLabel>Province / Region</FormLabel><FormControl><Input {...field} data-testid="input-province" /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <FormField control={addressForm.control} name="zipCode" render={({ field }) => (
                      <FormItem><FormLabel>ZIP Code</FormLabel><FormControl><Input {...field} className="max-w-[150px]" data-testid="input-zip" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <Button type="submit" className="gap-2" data-testid="button-save-address"><Save className="w-4 h-4" />Save Address</Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="password">
            <Card className="border-card-border">
              <CardHeader><CardTitle className="text-base">Change Password</CardTitle></CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(() => { setSaved("Password"); passwordForm.reset(); })} className="space-y-4 max-w-sm">
                    <FormField control={passwordForm.control} name="currentPassword" render={({ field }) => (
                      <FormItem><FormLabel>Current Password</FormLabel><FormControl><Input type="password" {...field} data-testid="input-current-password" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                      <FormItem><FormLabel>New Password</FormLabel><FormControl><Input type="password" {...field} data-testid="input-new-password" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (
                      <FormItem><FormLabel>Confirm New Password</FormLabel><FormControl><Input type="password" {...field} data-testid="input-confirm-password" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <Button type="submit" className="gap-2" data-testid="button-change-password"><Lock className="w-4 h-4" />Change Password</Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
