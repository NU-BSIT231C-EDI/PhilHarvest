import { Link } from "wouter";
import { Users, Package, ShoppingBag, TrendingUp, ArrowRight, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import DashboardLayout from "@/layouts/DashboardLayout";
import StatsCard from "@/components/shared/StatsCard";
import StatusBadge from "@/components/shared/StatusBadge";
import { orders, users, adminStats, announcements } from "@/data/mockData";

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function AdminDashboard() {
  return (
    <DashboardLayout role="admin" title="Admin Dashboard">
      <div className="p-6 space-y-6">
        {/* Announcements */}
        {announcements.filter((a) => a.active && a.type === "warning").map((a) => (
          <div key={a.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">{a.title}</p>
              <p className="text-xs text-amber-700 mt-0.5">{a.content}</p>
            </div>
          </div>
        ))}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard label="Total Users" value={adminStats.totalUsers.toLocaleString()} icon={Users} trend={adminStats.monthlyGrowth} trendLabel="this month" iconBg="bg-blue-50" iconColor="text-blue-600" />
          <StatsCard label="Total Orders" value={adminStats.totalOrders.toLocaleString()} icon={ShoppingBag} trend={8.4} iconBg="bg-amber-50" iconColor="text-amber-600" />
          <StatsCard label="Total Revenue" value={`₱${(adminStats.totalRevenue / 1000000).toFixed(2)}M`} icon={TrendingUp} trend={15.2} iconBg="bg-green-50" iconColor="text-green-600" />
          <StatsCard label="Active Sellers" value={adminStats.activeSellers} icon={Package} trend={6.1} iconBg="bg-purple-50" iconColor="text-purple-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Revenue Chart */}
          <Card className="border-card-border lg:col-span-2">
            <CardHeader><CardTitle className="text-base">Monthly Revenue (2024)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={adminStats.revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [`₱${v.toLocaleString()}`, "Revenue"]} />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <Card className="border-card-border">
            <CardHeader><CardTitle className="text-base">Products by Category</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={adminStats.categoryBreakdown} cx="50%" cy="45%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                    {adminStats.categoryBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders & Users */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card className="border-card-border">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Recent Orders</CardTitle>
              <Link href="/admin/orders"><Button variant="ghost" size="sm" className="gap-1 text-primary text-xs">View All <ArrowRight className="w-3.5 h-3.5" /></Button></Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {orders.slice(0, 5).map((o) => (
                  <div key={o.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors" data-testid={`row-order-${o.id}`}>
                    <div>
                      <p className="text-sm font-semibold">{o.poNumber}</p>
                      <p className="text-xs text-muted-foreground">{o.customerName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={o.status} />
                      <p className="text-sm font-bold text-primary">₱{o.totalAmount.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-card-border">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Recent Users</CardTitle>
              <Link href="/admin/users"><Button variant="ghost" size="sm" className="gap-1 text-primary text-xs">View All <ArrowRight className="w-3.5 h-3.5" /></Button></Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {users.slice(0, 5).map((u) => (
                  <div key={u.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors" data-testid={`row-user-${u.id}`}>
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{u.role}</p>
                    </div>
                    <StatusBadge status={u.status} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
