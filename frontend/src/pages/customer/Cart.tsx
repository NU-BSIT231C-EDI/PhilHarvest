import { Link } from "wouter";
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import DashboardLayout from "@/layouts/DashboardLayout";
import EmptyState from "@/components/shared/EmptyState";
import { useCart } from "@/contexts/CartContext";

export default function CustomerCart() {
  const { cart, removeFromCart, updateQuantity } = useCart();

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = cart.length > 0 ? 150 : 0;
  const total = subtotal + deliveryFee;

  return (
    <DashboardLayout role="customer" title="My Cart">
      <div className="p-6">
        {cart.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="Your cart is empty"
            description="Add some fresh produce to get started."
            actionLabel="Browse Products"
            onAction={() => { window.location.href = "/customer/browse"; }}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              {cart.map((item) => (
                <Card key={item.productId} className="border-card-border" data-testid={`card-cart-${item.productId}`}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <img
                      src={item.image || "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=200&q=80"}
                      alt={item.productName}
                      className="w-16 h-16 rounded-xl object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">{item.sellerName}</p>
                      <p className="text-sm font-bold text-primary mt-0.5">₱{item.price}/{item.unit}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center border border-border rounded-lg">
                        <button
                          onClick={() => updateQuantity(item.productId, -1)}
                          className="p-1.5 hover:bg-muted transition-colors"
                          data-testid={`button-decrease-${item.productId}`}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span
                          className="px-3 text-sm font-semibold min-w-[32px] text-center"
                          data-testid={`text-qty-${item.productId}`}
                        >
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, 1)}
                          className="p-1.5 hover:bg-muted transition-colors"
                          data-testid={`button-increase-${item.productId}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p
                        className="text-sm font-bold w-20 text-right"
                        data-testid={`text-subtotal-${item.productId}`}
                      >
                        ₱{(item.price * item.quantity).toLocaleString()}
                      </p>
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        data-testid={`button-remove-${item.productId}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="space-y-4">
              <Card className="border-card-border">
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-bold text-foreground">Order Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal ({cart.length} item{cart.length !== 1 ? "s" : ""})</span>
                      <span>₱{subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Delivery Fee</span>
                      <span>₱{deliveryFee}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-base">
                      <span>Total</span>
                      <span className="text-primary" data-testid="text-order-total">₱{total.toLocaleString()}</span>
                    </div>
                  </div>
                  <Link href="/customer/checkout">
                    <Button className="w-full gap-2 font-semibold mt-2" data-testid="button-checkout">
                      Proceed to Checkout <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link href="/customer/browse">
                    <Button variant="ghost" className="w-full text-sm" data-testid="button-continue-shopping">
                      Continue Shopping
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
