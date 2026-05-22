import { Link } from "wouter";
import { Package, ShoppingBag, Heart, Bell, ShoppingCart, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardLayout from "@/layouts/DashboardLayout";
import StatsCard from "@/components/shared/StatsCard";
import StatusBadge from "@/components/shared/StatusBadge";
import ProductCard from "@/components/shared/ProductCard";
import { orders, products, notifications } from "@/data/mockData";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useToast } from "@/hooks/use-toast";

const myOrders = orders.filter((o) => o.customerId === "u1").slice(0, 4);
const recommended = products.filter((p) => p.featured).slice(0, 4);
const unread = notifications.filter((n) => !n.read).length;

export default function CustomerDashboard() {
  const { addToCart, cartCount } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist, wishlistCount } = useWishlist();
  const { toast } = useToast();

  function handleAddToCart(product: Parameters<typeof addToCart>[0]) {
    addToCart(product);
    toast({ title: "Added to cart", description: `${product.name} added to your cart.` });
  }

  function handleWishlist(product: Parameters<typeof addToWishlist>[0]) {
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
      toast({ title: "Removed from wishlist", description: `${product.name} removed from your wishlist.` });
    } else {
      addToWishlist(product);
      toast({ title: "Added to wishlist", description: `${product.name} saved to your wishlist.` });
    }
  }

  return (
    <DashboardLayout role="customer" title="Dashboard">
      <div className="p-6 space-y-6">
        {/* Welcome */}
        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-6 border border-primary/20">
          <h2 className="text-xl font-bold text-foreground">Good morning, Ana!</h2>
          <p className="text-muted-foreground text-sm mt-1">You have {unread} new notifications and {myOrders.filter(o => o.status !== "delivered" && o.status !== "cancelled").length} active orders.</p>
          <div className="flex gap-3 mt-4">
            <Link href="/customer/browse"><Button size="sm" className="gap-2" data-testid="button-browse-now"><ShoppingBag className="w-4 h-4" />Browse Products</Button></Link>
            <Link href="/customer/orders"><Button size="sm" variant="outline" className="gap-2" data-testid="button-view-orders"><Package className="w-4 h-4" />My Orders</Button></Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard label="Total Orders" value={orders.filter(o => o.customerId === "u1").length} icon={Package} iconBg="bg-blue-50" iconColor="text-blue-600" />
          <StatsCard label="Cart Items" value={cartCount} icon={ShoppingCart} iconBg="bg-amber-50" iconColor="text-amber-600" />
          <StatsCard label="Wishlist" value={wishlistCount} icon={Heart} iconBg="bg-rose-50" iconColor="text-rose-600" />
          <StatsCard label="Notifications" value={unread} icon={Bell} iconBg="bg-purple-50" iconColor="text-purple-600" />
        </div>

        {/* Recent Orders */}
        <Card className="border-card-border">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Orders</CardTitle>
            <Link href="/customer/orders"><Button variant="ghost" size="sm" className="gap-1 text-primary text-xs">View All <ArrowRight className="w-3.5 h-3.5" /></Button></Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myOrders.map((order) => (
                <Link href={`/customer/orders/${order.id}`} key={order.id}>
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer" data-testid={`row-order-${order.id}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{order.poNumber}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{order.orderDate}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={order.status} />
                      <p className="text-sm font-bold text-primary">₱{order.totalAmount.toLocaleString()}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recommended Products */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-foreground">Recommended for You</h3>
            <Link href="/customer/browse"><Button variant="ghost" size="sm" className="gap-1 text-primary text-xs">See All <ArrowRight className="w-3.5 h-3.5" /></Button></Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {recommended.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onAddToCart={handleAddToCart}
                onWishlist={handleWishlist}
                inWishlist={isInWishlist(p.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
