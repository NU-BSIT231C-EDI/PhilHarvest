import { useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useAuthStore } from "@/store/auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Leaf, ShoppingCart, Building2, Store, ShieldCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof schema>;
type RegisterForm = z.infer<typeof registerSchema>;

type AccountType = "small" | "contract" | "seller" | "admin" | null;

interface TypeConfig {
  label: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  role: "customer" | "contract" | "seller" | "admin";
  userType: "small_business" | "big_business" | null;
  redirect: string;
  accentBtn: string;
}

const typeConfigs: Record<string, TypeConfig> = {
  small: {
    label: "Small Business Customer",
    icon: ShoppingCart,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    role: "customer",
    userType: "small_business",
    redirect: "/customer/dashboard",
    accentBtn: "bg-blue-600 hover:bg-blue-700",
  },
  contract: {
    label: "Big Business Customer",
    icon: Building2,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    role: "contract",
    userType: "big_business",
    redirect: "/contract/dashboard",
    accentBtn: "bg-violet-600 hover:bg-violet-700",
  },
  seller: {
    label: "Seller / Supplier",
    icon: Store,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    role: "seller",
    userType: null,
    redirect: "/seller/dashboard",
    accentBtn: "bg-emerald-600 hover:bg-emerald-700",
  },
  admin: {
    label: "Admin",
    icon: ShieldCheck,
    iconBg: "bg-slate-100",
    iconColor: "text-slate-700",
    role: "admin",
    userType: null,
    redirect: "/admin/dashboard",
    accentBtn: "bg-slate-700 hover:bg-slate-800",
  },
};

// Fallback when no type in URL — show tabs for all roles
const fallbackRedirects: Record<string, string> = {
  customer: "/customer/dashboard",
  contract: "/contract/dashboard",
  seller: "/seller/dashboard",
  logistics: "/logistics/dashboard",
  admin: "/admin/dashboard",
};

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const typeParam = params.get("type") as AccountType;
  const config = typeParam && typeConfigs[typeParam] ? typeConfigs[typeParam] : null;

  const { setRole, setUserType } = useAuthStore();

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  function handleAuth(cfg: TypeConfig) {
    setRole(cfg.role);
    if (cfg.userType) setUserType(cfg.userType);
    navigate(cfg.redirect);
  }

  // Fallback (no type param) — legacy tab-based login
  function onFallbackSubmit(_data: LoginForm, role: string) {
    setRole(role as Parameters<typeof setRole>[0]);
    navigate(fallbackRedirects[role] ?? "/");
  }

  const PasswordToggle = () => (
    <button
      type="button"
      onClick={() => setShowPassword((v) => !v)}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
    >
      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );

  // ── Type-specific login page ──────────────────────────────────────────────
  if (config) {
    const Icon = config.icon;
    return (
      <div className="min-h-screen bg-linear-to-br from-primary/5 via-background to-secondary/5 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
            <button
              onClick={() => navigate("/select-type")}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <span className="text-border">|</span>
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 font-bold text-foreground hover:text-primary transition-colors"
            >
              <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
                <Leaf className="w-4 h-4 text-primary-foreground" />
              </div>
              PhilHarvest
            </button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            {/* Type badge */}
            <div className="flex items-center justify-center mb-6">
              <div className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border border-border ${config.iconBg}`}>
                <Icon className={`w-5 h-5 ${config.iconColor}`} />
                <span className="text-sm font-semibold text-foreground">{config.label}</span>
              </div>
            </div>

            <div className="text-center mb-8">
              <h1 className="text-2xl font-extrabold text-foreground">Welcome to PhilHarvest</h1>
              <p className="text-muted-foreground text-sm mt-1">Sign in to your account or create a new one</p>
            </div>

            <div className="bg-card border border-card-border rounded-2xl shadow-sm overflow-hidden">
              <Tabs defaultValue="login">
                <TabsList className="grid grid-cols-2 w-full rounded-none border-b border-border h-12">
                  <TabsTrigger value="login" className="rounded-none text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-primary">
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger value="register" className="rounded-none text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-primary">
                    Create Account
                  </TabsTrigger>
                </TabsList>

                {/* Sign In */}
                <TabsContent value="login" className="p-6">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(() => handleAuth(config))} className="space-y-4">
                      <FormField control={loginForm.control} name="email" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="you@company.com" {...field} data-testid="input-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={loginForm.control} name="password" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input type={showPassword ? "text" : "password"} placeholder="Enter your password" {...field} data-testid="input-password" />
                              <PasswordToggle />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <div className="flex justify-end">
                        <Link href="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
                      </div>
                      <Button type="submit" className={`w-full font-semibold text-white ${config.accentBtn}`} data-testid="button-login">
                        Sign In
                      </Button>
                    </form>
                  </Form>
                </TabsContent>

                {/* Create Account */}
                <TabsContent value="register" className="p-6">
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(() => handleAuth(config))} className="space-y-4">
                      <FormField control={registerForm.control} name="name" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Juan dela Cruz" {...field} data-testid="input-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={registerForm.control} name="email" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="you@company.com" {...field} data-testid="input-email-register" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={registerForm.control} name="password" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input type={showPassword ? "text" : "password"} placeholder="Choose a password" {...field} data-testid="input-password-register" />
                              <PasswordToggle />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <Button type="submit" className={`w-full font-semibold text-white ${config.accentBtn}`} data-testid="button-register">
                        Create Account
                      </Button>
                      <p className="text-xs text-center text-muted-foreground">
                        By signing up you agree to our{" "}
                        <span className="text-primary">Terms of Service</span> and{" "}
                        <span className="text-primary">Privacy Policy</span>.
                      </p>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Not the right account type?{" "}
              <button onClick={() => navigate("/select-type")} className="text-primary font-medium hover:underline">
                Go back and choose again
              </button>
            </p>
          </div>
        </main>
      </div>
    );
  }

  // ── Fallback: no type param — classic tab login ───────────────────────────
  const FallbackForm = ({ role }: { role: string }) => (
    <Form {...loginForm}>
      <form onSubmit={loginForm.handleSubmit((data) => onFallbackSubmit(data, role))} className="space-y-4">
        <FormField control={loginForm.control} name="email" render={({ field }) => (
          <FormItem>
            <FormLabel>Email Address</FormLabel>
            <FormControl>
              <Input type="email" placeholder="your@email.com" {...field} data-testid={`input-email-${role}`} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={loginForm.control} name="password" render={({ field }) => (
          <FormItem>
            <FormLabel>Password</FormLabel>
            <FormControl>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} placeholder="Enter your password" {...field} data-testid={`input-password-${role}`} />
                <PasswordToggle />
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
    <div className="min-h-screen bg-linear-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <button onClick={() => navigate("/")} className="inline-flex items-center gap-2 text-2xl font-bold text-primary mb-3">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
              <Leaf className="w-5 h-5 text-primary-foreground" />
            </div>
            PhilHarvest
          </button>
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
                <FallbackForm role={role} />
              </TabsContent>
            ))}
          </Tabs>

          <div className="mt-5 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <button onClick={() => navigate("/select-type")} className="text-primary font-medium hover:underline" data-testid="link-register">
                Choose your account type
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
