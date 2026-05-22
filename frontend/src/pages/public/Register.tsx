import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Leaf, User, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import PublicLayout from "@/layouts/PublicLayout";

const schema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Enter a valid phone number"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  terms: z.boolean().refine((v) => v, "You must accept the terms"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof schema>;

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"customer" | "seller">("customer");
  const [, navigate] = useLocation();

  const form = useForm<RegisterForm>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: "", lastName: "", email: "", phone: "", password: "", confirmPassword: "", terms: false },
  });

  function onSubmit(_data: RegisterForm) {
    localStorage.setItem("demoRole", role);
    navigate(role === "seller" ? "/seller/dashboard" : "/customer/dashboard");
  }

  return (
    <PublicLayout>
      <div className="min-h-[calc(100vh-160px)] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 text-2xl font-bold text-primary mb-3">
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
                <Leaf className="w-5 h-5 text-primary-foreground" />
              </div>
              PhilHarvest
            </div>
            <h1 className="text-2xl font-bold text-foreground">Create your account</h1>
            <p className="text-muted-foreground text-sm mt-1">Join thousands of Filipinos on PhilHarvest</p>
          </div>

          <div className="bg-card border border-card-border rounded-2xl p-6 shadow-sm">
            {/* Role Selector */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                onClick={() => setRole("customer")}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-colors text-left ${role === "customer" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                data-testid="button-role-customer"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${role === "customer" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Customer</p>
                  <p className="text-xs text-muted-foreground">Buy fresh produce</p>
                </div>
              </button>
              <button
                onClick={() => setRole("seller")}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-colors text-left ${role === "seller" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                data-testid="button-role-seller"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${role === "seller" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Seller / Farmer</p>
                  <p className="text-xs text-muted-foreground">Sell your harvest</p>
                </div>
              </button>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="firstName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl><Input placeholder="Juan" {...field} data-testid="input-first-name" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="lastName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl><Input placeholder="dela Cruz" {...field} data-testid="input-last-name" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl><Input type="email" placeholder="juan@email.com" {...field} data-testid="input-email" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl><Input placeholder="09171234567" {...field} data-testid="input-phone" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type={showPassword ? "text" : "password"} placeholder="Min. 8 characters" {...field} data-testid="input-password" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl><Input type="password" placeholder="Repeat password" {...field} data-testid="input-confirm-password" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="terms" render={({ field }) => (
                  <FormItem className="flex items-start gap-2.5">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-terms" /></FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-normal text-sm cursor-pointer">
                        I agree to the <Link href="#" className="text-primary hover:underline">Terms of Service</Link> and <Link href="#" className="text-primary hover:underline">Privacy Policy</Link>
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )} />
                <Button type="submit" className="w-full font-semibold" data-testid="button-register-submit">
                  Create Account
                </Button>
              </form>
            </Form>

            <p className="text-center text-sm text-muted-foreground mt-4">
              Already have an account?{" "}
              <Link href="/login" className="text-primary font-medium hover:underline" data-testid="link-login">Sign in here</Link>
            </p>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
