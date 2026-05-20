import { Link } from "wouter";
import { TrendingUp, Package, Archive, ShoppingBag, ArrowRight, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import DashboardLayout from "@/layouts/DashboardLayout";
import StatsCard from "@/components/shared/StatsCard";
import StatusBadge from "@/components/shared/StatusBadge";
import { orders, sellerStats } from "@/data/mockData";

const sellerOrders = orders.filter((o) => o.sellerId === "s1").slice(0, 4);

export default function SellerDashboard() {
  return (
    <DashboardLayout role="seller" title="Dashboard">
      <div className="p-6 space-y-6">
        <div className="bg-gradient-to-r from-secondary/10 to-primary/10 rounded-2xl p-6 border border-secondary/20">
          <h2 className="text-xl font-bold text-foreground">Welcome back, Mang Jose!</h2>
          <p className="text-muted-foreground text-sm mt-1">Santos Family Farm · Benguet, CAR</p>
          <div className="flex gap-3 mt-4">
            <Link href="/seller/orders"><Button size="sm" className="gap-2" data-testid="button-manage-orders"><Package className="w-4 h-4" />Manage Orders</Button></Link>
            <Link href="/seller/products/new"><Button size="sm" variant="outline" className="gap-2" data-testid="button-add-product"><Archive className="w-4 h-4" />Add Product</Button></Link>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard label="Total Revenue" value={`₱${sellerStats.totalRevenue.toLocaleString()}`} icon={TrendingUp} trend={12} trendLabel="vs last month" iconBg="bg-green-50" iconColor="text-green-600" />
          <StatsCard label="Total Orders" value={sellerStats.totalOrders} icon={ShoppingBag} trend={8} trendLabel="vs last month" iconBg="bg-blue-50" iconColor="text-blue-600" />
          <StatsCard label="Products Listed" value={sellerStats.totalProducts} icon={Archive} iconBg="bg-amber-50" iconColor="text-amber-600" />
          <StatsCard label="Pending Orders" value={sellerStats.pendingOrders} icon={Package} iconBg="bg-rose-50" iconColor="text-rose-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card className="border-card-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Revenue This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={sellerStats.revenueByWeek}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [`₱${v.toLocaleString()}`, "Revenue"]} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-card-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top Selling Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sellerStats.topProducts.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-3" data-testid={`row-top-product-${i}`}>
                    <span className="text-xs font-bold text-muted-foreground w-5 text-center">{i + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{p.name}</p>
                      <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(p.sales / sellerStats.topProducts[0].sales) * 100}%` }} />
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground">{p.sales} sold</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-card-border">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Orders</CardTitle>
            <Link href="/seller/orders"><Button variant="ghost" size="sm" className="gap-1 text-primary text-xs">View All <ArrowRight className="w-3.5 h-3.5" /></Button></Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left pb-2 text-xs text-muted-foreground font-medium">Order #</th>
                    <th className="text-left pb-2 text-xs text-muted-foreground font-medium">Customer</th>
                    <th className="text-left pb-2 text-xs text-muted-foreground font-medium">Date</th>
                    <th className="text-left pb-2 text-xs text-muted-foreground font-medium">Status</th>
                    <th className="text-right pb-2 text-xs text-muted-foreground font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sellerOrders.map((o) => (
                    <tr key={o.id} data-testid={`row-order-${o.id}`}>
                      <td className="py-2.5 font-semibold">{o.poNumber}</td>
                      <td className="py-2.5 text-muted-foreground">{o.customerName}</td>
                      <td className="py-2.5 text-muted-foreground">{o.orderDate}</td>
                      <td className="py-2.5"><StatusBadge status={o.status} /></td>
                      <td className="py-2.5 text-right font-bold text-primary">₱{o.totalAmount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
