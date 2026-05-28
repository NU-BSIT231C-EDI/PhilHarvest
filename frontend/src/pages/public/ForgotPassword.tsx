import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Leaf, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import PublicLayout from "@/layouts/PublicLayout";

const schema = z.object({
  email: z.string().email("Invalid email address"),
});

type ForgotForm = z.infer<typeof schema>;

export default function ForgotPassword() {
  const [submitted, setSubmitted] = useState(false);
  const form = useForm<ForgotForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

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
          </div>

          <div className="bg-card border border-card-border rounded-2xl p-6 shadow-sm">
            {submitted ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-9 h-9 text-secondary" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">Check Your Email</h2>
                <p className="text-sm text-muted-foreground mb-6">We've sent a password reset link to your email address. Please check your inbox and follow the instructions.</p>
                <Link href="/login">
                  <Button variant="outline" className="gap-2" data-testid="button-back-to-login">
                    <ArrowLeft className="w-4 h-4" /> Back to Sign In
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-5">
                  <h2 className="text-xl font-bold text-foreground">Forgot your password?</h2>
                  <p className="text-sm text-muted-foreground mt-1">Enter your email address and we'll send you a link to reset your password.</p>
                </div>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(() => setSubmitted(true))} className="space-y-4">
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input type="email" placeholder="your@email.com" className="pl-9" {...field} data-testid="input-email" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="submit" className="w-full font-semibold" data-testid="button-reset-password">
                      Send Reset Link
                    </Button>
                  </form>
                </Form>
                <div className="mt-4 text-center">
                  <Link href="/login" className="text-sm text-primary hover:underline inline-flex items-center gap-1" data-testid="link-back-login">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
