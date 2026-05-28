import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { CheckCircle, CreditCard, Wallet, Banknote, MapPin, BadgePercent, IdCard, Loader2, XCircle, AlertTriangle, FileText } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import DashboardLayout from "@/layouts/DashboardLayout";
import { verifyTapatCard, recordTapatTransaction, tapatSavings, formatPeso, type TapatVerifyResult, type TapatReceipt, type TapatLineItem, type ItemCategory } from "@/services/tapatApi";

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

// Fresh agri produce is treated as a basic necessity / prime commodity (BNPC)
// for the statutory 5% discount (JAO 24-02).
const mockCorpContract = {
  contractNumber: "CTR-2024-001",
  status: "active" as const,
  expiresAt: "2024-12-31",
  company: "FreshMart Philippines Inc.",
};

export default function Checkout() {
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [ordered, setOrdered] = useState(false);
  const [, navigate] = useLocation();
  const { userType } = useAuthStore();
  const { cart } = useCart();
  const isCorp = userType === "big_business";
  const hasActiveContract = true;
  const activeContract = hasActiveContract ? mockCorpContract : null;

  const [tapatCardId, setTapatCardId] = useState("");
  const [tapatResult, setTapatResult] = useState<TapatVerifyResult | null>(null);
  const [tapatLoading, setTapatLoading] = useState(false);
  const [tapatError, setTapatError] = useState<string | null>(null);
  const [tapatReceipt, setTapatReceipt] = useState<TapatReceipt | null>(null);

  const form = useForm<CheckoutForm>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "Ana Reyes", phone: "09171234567", address: "123 Roxas Blvd", city: "Pasay City", province: "Metro Manila", notes: "" },
  });

  function onSubmit(_data: CheckoutForm) {
    // If a TAPAT card was approved, post the discounted sale to the Hub as an
    // EDI 826 for government compliance reporting (mirrors honeycoffee).
    if (approved) setTapatReceipt(recordTapatTransaction(approved));
    setOrdered(true);
  }

  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.quantity, 0), [cart]);

  const tapatItems: TapatLineItem[] = useMemo(() => cart.map((i) => ({
    sku: `AGRI-${i.productId}`,
    qty: i.quantity,
    unit_price: i.price,
    category: "BNPC",
  })), [cart]);

  async function applyTapatCard() {
    setTapatLoading(true);
    setTapatError(null);
    setTapatResult(null);
    try {
      const result = await verifyTapatCard(tapatCardId, tapatItems);
      setTapatResult(result);
      if (!result.approved) setTapatError(result.message);
    } catch (err) {
      setTapatError(err instanceof Error ? err.message : "Could not reach the TAPAT Hub");
    } finally {
      setTapatLoading(false);
    }
  }

  function clearTapatCard() {
    setTapatCardId("");
    setTapatResult(null);
    setTapatError(null);
  }

  const approved = tapatResult?.approved ? tapatResult : null;
  const savings = approved ? tapatSavings(approved.discount) : 0;
  const deliveryFee = 150;
  const goodsTotal = approved ? approved.discount.net_total : subtotal;
  const grandTotal = goodsTotal + deliveryFee;

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
            {tapatReceipt && (
              <div className="text-left rounded-xl border border-card-border bg-muted/40 p-4 mb-6" data-testid="tapat-receipt">
                <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <BadgePercent className="w-4 h-4 text-primary" />
                  TAPAT {tapatReceipt.beneficiary_type === "SC" ? "Senior Citizen" : "PWD"} discount applied
                </p>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between"><dt className="text-muted-foreground">Receipt</dt><dd className="font-mono text-xs">{tapatReceipt.receipt_number}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Gross</dt><dd>{formatPeso(tapatReceipt.gross_amount)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">VAT removed</dt><dd>−{formatPeso(tapatReceipt.vat_removed)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Statutory discount</dt><dd>−{formatPeso(tapatReceipt.discount_amount)}</dd></div>
                  <div className="flex justify-between font-semibold text-foreground pt-1 border-t border-card-border mt-1"><dt>Goods total</dt><dd>{formatPeso(tapatReceipt.net_total)}</dd></div>
                </dl>
              </div>
            )}
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
            {/* Big Business Contract Banner */}
            {isCorp && (
              activeContract ? (
                <div className="flex items-start gap-3 rounded-xl border border-green-300 bg-green-50 p-4">
                  <FileText className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-green-800">Active Supply Contract</p>
                    <p className="text-xs text-green-700 mt-0.5">
                      {activeContract.contractNumber} · {activeContract.company} · Expires {activeContract.expiresAt}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4" data-testid="banner-no-contract">
                  <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-destructive">No Active Supply Contract</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Your account requires an active supply contract to place orders. Please contact our sales team to set one up.
                    </p>
                  </div>
                </div>
              )
            )}

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

            {/* TAPAT Discount Card (PWD / Senior Citizen) — small business only */}
            {!isCorp && (
              <Card className="border-card-border">
                <CardContent className="p-5">
                  <h3 className="font-bold text-foreground mb-1 flex items-center gap-2"><BadgePercent className="w-4 h-4 text-primary" />TAPAT Discount Card</h3>
                  <p className="text-sm text-muted-foreground mb-4">PWD / Senior Citizen cardholders get the statutory discount (RA 9994 / RA 10754) applied automatically.</p>
                  {approved ? (
                    <div className="flex items-center justify-between rounded-xl border-2 border-secondary/40 bg-secondary/5 p-3.5">
                      <div className="flex items-center gap-2.5">
                        <IdCard className="w-5 h-5 text-secondary" />
                        <div>
                          <p className="text-sm font-semibold text-foreground">{approved.beneficiary_type === "PWD" ? "PWD" : "Senior Citizen"} card applied</p>
                          <p className="text-xs text-muted-foreground">{approved.card_id} · {formatPeso(savings)} saved</p>
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={clearTapatCard} data-testid="button-tapat-remove">Remove</Button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Input value={tapatCardId} onChange={(e) => setTapatCardId(e.target.value)} placeholder="Tap or enter card number (e.g. PWD-2024-000123)" data-testid="input-tapat-card" />
                      <Button type="button" onClick={applyTapatCard} disabled={tapatLoading || !tapatCardId.trim()} className="font-semibold sm:w-32" data-testid="button-tapat-apply">
                        {tapatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                      </Button>
                    </div>
                  )}
                  {tapatError && !approved && (
                    <p className="mt-2.5 flex items-center gap-1.5 text-sm text-destructive" data-testid="text-tapat-error"><XCircle className="w-4 h-4" />{tapatError}</p>
                  )}
                  {approved?.bnpc_cap_exceeded && (
                    <p className="mt-2.5 text-xs text-muted-foreground">Weekly ₱2,500 basic-necessities discount cap reached — excess billed at full price.</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary */}
          <div>
            <Card className="border-card-border sticky top-20">
              <CardContent className="p-5 space-y-4">
                <h3 className="font-bold text-foreground">Order Summary</h3>
                <div className="space-y-2">
                  {cart.map((item) => (
                    <div key={item.productId} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.productName} × {item.quantity}</span>
                      <span>₱{(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPeso(subtotal)}</span></div>
                  {approved && (
                    <>
                      {approved.discount.vat_removed > 0 && (
                        <div className="flex justify-between text-secondary"><span>VAT exemption</span><span data-testid="text-tapat-vat">−{formatPeso(approved.discount.vat_removed)}</span></div>
                      )}
                      <div className="flex justify-between text-secondary"><span>TAPAT discount ({approved.beneficiary_type === "PWD" ? "PWD" : "Senior"})</span><span data-testid="text-tapat-discount">−{formatPeso(approved.discount.discount_amount)}</span></div>
                    </>
                  )}
                  <div className="flex justify-between"><span className="text-muted-foreground">Delivery Fee</span><span>{formatPeso(deliveryFee)}</span></div>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-base"><span>Total</span><span className="text-primary" data-testid="text-checkout-total">{formatPeso(grandTotal)}</span></div>
                {approved && (
                  <p className="-mt-1 text-right text-xs font-medium text-secondary" data-testid="text-tapat-savings">You saved {formatPeso(savings)} with your TAPAT card</p>
                )}
                <Button type="submit" form="checkout-form" className="w-full font-semibold" disabled={isCorp && !activeContract} data-testid="button-place-order">
                  Place Order
                </Button>
                {isCorp && !activeContract && (
                  <p className="text-center text-xs text-muted-foreground" data-testid="text-contract-required">
                    A supply contract is required to proceed
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
