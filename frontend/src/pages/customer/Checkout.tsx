import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { CheckCircle, CreditCard, Wallet, Banknote, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import DashboardLayout from "@/layouts/DashboardLayout";

const schema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(10),
  address: z.string().min(10),
  city: z.string().min(2),
  province: z.string().min(2),
  notes: z.string().optional(),
});

type CheckoutForm = z.infer<typeof schema>;

const paymentMethods = [
  { id: "cod", label: "Cash on Delivery", icon: Banknote },
  { id: "gcash", label: "GCash", icon: Wallet },
  { id: "card", label: "Credit / Debit Card", icon: CreditCard },
];

const cartSummary = [
  { name: "Benguet Tomatoes", qty: 5, price: 85 },
  { name: "Carabao Mangoes", qty: 3, price: 180 },
  { name: "Pechay (Bok Choy)", qty: 2, price: 40 },
];

export default function Checkout() {
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [ordered, setOrdered] = useState(false);
  const [, navigate] = useLocation();

  const form = useForm<CheckoutForm>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "Ana Reyes", phone: "09171234567", address: "123 Roxas Blvd", city: "Pasay City", province: "Metro Manila", notes: "" },
  });

  function onSubmit(_data: CheckoutForm) {
    setOrdered(true);
  }

  const subtotal = cartSummary.reduce((s, i) => s + i.price * i.qty, 0);

  if (ordered) {
    return (
      <DashboardLayout role="customer" title="Order Placed">
        <div className="flex items-center justify-center min-h-[60vh] p-6">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-10 h-10 text-secondary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Order Placed!</h2>
            <p className="text-muted-foreground mb-2">Your order has been successfully placed. You will receive a confirmation shortly.</p>
            <p className="text-sm font-semibold text-primary mb-6">Order #PO-2024-{Math.floor(Math.random() * 999) + 100}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => navigate("/customer/orders")} data-testid="button-view-orders">Track My Order</Button>
              <Button variant="outline" onClick={() => navigate("/customer/browse")} data-testid="button-continue-shopping">Continue Shopping</Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="customer" title="Checkout">
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            {/* Delivery Address */}
            <Card className="border-card-border">
              <CardContent className="p-5">
                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" />Delivery Address</h3>
                <Form {...form}>
                  <form id="checkout-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="fullName" render={({ field }) => (
                        <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} data-testid="input-full-name" /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input {...field} data-testid="input-phone" /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="address" render={({ field }) => (
                      <FormItem><FormLabel>Street Address</FormLabel><FormControl><Input {...field} data-testid="input-address" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="city" render={({ field }) => (
                        <FormItem><FormLabel>City / Municipality</FormLabel><FormControl><Input {...field} data-testid="input-city" /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="province" render={({ field }) => (
                        <FormItem><FormLabel>Province / Region</FormLabel><FormControl><Input {...field} data-testid="input-province" /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="notes" render={({ field }) => (
                      <FormItem><FormLabel>Order Notes (optional)</FormLabel><FormControl><Textarea placeholder="Special instructions for delivery..." {...field} data-testid="textarea-notes" /></FormControl><FormMessage /></FormItem>
                    )} />
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card className="border-card-border">
              <CardContent className="p-5">
                <h3 className="font-bold text-foreground mb-4">Payment Method</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {paymentMethods.map((pm) => (
                    <button key={pm.id} onClick={() => setPaymentMethod(pm.id)} className={`flex items-center gap-2.5 p-3.5 rounded-xl border-2 text-left transition-colors ${paymentMethod === pm.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`} data-testid={`button-payment-${pm.id}`}>
                      <pm.icon className={`w-5 h-5 ${paymentMethod === pm.id ? "text-primary" : "text-muted-foreground"}`} />
                      <span className={`text-sm font-medium ${paymentMethod === pm.id ? "text-primary" : "text-foreground"}`}>{pm.label}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card className="border-card-border sticky top-20">
              <CardContent className="p-5 space-y-4">
                <h3 className="font-bold text-foreground">Order Summary</h3>
                <div className="space-y-2">
                  {cartSummary.map((item) => (
                    <div key={item.name} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.name} × {item.qty}</span>
                      <span>₱{(item.price * item.qty).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₱{subtotal.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Delivery Fee</span><span>₱150</span></div>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-base"><span>Total</span><span className="text-primary" data-testid="text-checkout-total">₱{(subtotal + 150).toLocaleString()}</span></div>
                <Button type="submit" form="checkout-form" className="w-full font-semibold" data-testid="button-place-order">Place Order</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
