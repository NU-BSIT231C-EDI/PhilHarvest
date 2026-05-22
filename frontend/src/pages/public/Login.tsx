import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuthStore } from "@/store/auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PublicLayout from "@/layouts/PublicLayout";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof schema>;

const roleRedirects: Record<string, string> = {
  customer: "/customer/dashboard",
  seller: "/seller/dashboard",
  logistics: "/logistics/dashboard",
  admin: "/admin/dashboard",
};

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [, navigate] = useLocation();
  const { setRole } = useAuthStore();

  const form = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(_data: LoginForm, role: string) {
    setRole(role as Parameters<typeof setRole>[0]);
    navigate(roleRedirects[role]);
  }

  const RoleForm = ({ role }: { role: string }) => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => onSubmit(data, role))} className="space-y-4">
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem>
            <FormLabel>Email Address</FormLabel>
            <FormControl>
              <Input type="email" placeholder="your@email.com" {...field} data-testid={`input-email-${role}`} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="password" render={({ field }) => (
          <FormItem>
            <FormLabel>Password</FormLabel>
            <FormControl>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} placeholder="Enter your password" {...field} data-testid={`input-password-${role}`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
        </div>
        <Button type="submit" className="w-full font-semibold" data-testid={`button-login-${role}`}>
          Sign In as {role.charAt(0).toUpperCase() + role.slice(1)}
        </Button>
      </form>
    </Form>
  );

  return (
    <PublicLayout>
      <div className="min-h-[calc(100vh-160px)] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 text-2xl font-bold text-primary mb-3">
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
                <Leaf className="w-5 h-5 text-primary-foreground" />
              </div>
              PhilHarvest
            </div>
            <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
            <p className="text-muted-foreground text-sm mt-1">Sign in to your account</p>
          </div>

          <div className="bg-card border border-card-border rounded-2xl p-6 shadow-sm">
            <Tabs defaultValue="customer">
              <TabsList className="grid grid-cols-4 mb-6 w-full">
                <TabsTrigger value="customer" className="text-xs">Customer</TabsTrigger>
                <TabsTrigger value="seller" className="text-xs">Seller</TabsTrigger>
                <TabsTrigger value="logistics" className="text-xs">Logistics</TabsTrigger>
                <TabsTrigger value="admin" className="text-xs">Admin</TabsTrigger>
              </TabsList>
              {["customer", "seller", "logistics", "admin"].map((role) => (
                <TabsContent key={role} value={role}>
                  <RoleForm role={role} />
                </TabsContent>
              ))}
            </Tabs>

            <div className="mt-5 text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link href="/register" className="text-primary font-medium hover:underline" data-testid="link-register">
                  Register here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
