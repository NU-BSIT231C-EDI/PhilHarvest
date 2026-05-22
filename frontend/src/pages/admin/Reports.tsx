import { Download, TrendingUp, Users, ShoppingBag, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend } from "recharts";
import DashboardLayout from "@/layouts/DashboardLayout";
import StatsCard from "@/components/shared/StatsCard";
import { adminStats } from "@/data/mockData";

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

const userGrowth = [
  { month: "Jan", customers: 380, sellers: 45 },
  { month: "Feb", customers: 420, sellers: 52 },
  { month: "Mar", customers: 510, sellers: 61 },
  { month: "Apr", customers: 480, sellers: 58 },
  { month: "May", customers: 600, sellers: 74 },
];

const orderData = [
  { month: "Jan", orders: 1850, revenue: 580000 },
  { month: "Feb", orders: 2100, revenue: 620000 },
  { month: "Mar", orders: 2450, revenue: 710000 },
  { month: "Apr", orders: 2200, revenue: 680000 },
  { month: "May", orders: 2800, revenue: 850000 },
];

export default function AdminReports() {
  return (
    <DashboardLayout role="admin" title="Reports & Analytics">
      <div className="p-6 space-y-5">
        <div className="flex justify-end">
          <Button variant="outline" size="sm" className="gap-2" data-testid="button-export-report"><Download className="w-4 h-4" />Export Full Report</Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard label="Total Revenue" value={`₱${(adminStats.totalRevenue / 1000000).toFixed(2)}M`} icon={TrendingUp} trend={15.2} iconBg="bg-green-50" iconColor="text-green-600" />
          <StatsCard label="Total Users" value={adminStats.totalUsers.toLocaleString()} icon={Users} trend={adminStats.monthlyGrowth} iconBg="bg-blue-50" iconColor="text-blue-600" />
          <StatsCard label="Total Orders" value={adminStats.totalOrders.toLocaleString()} icon={ShoppingBag} trend={8.4} iconBg="bg-amber-50" iconColor="text-amber-600" />
          <StatsCard label="Active Sellers" value={adminStats.activeSellers} icon={Package} trend={6.1} iconBg="bg-purple-50" iconColor="text-purple-600" />
        </div>

        <Tabs defaultValue="revenue">
          <TabsList>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue">
            <Card className="border-card-border mt-3">
              <CardHeader><CardTitle className="text-base">Monthly Revenue Trend (₱)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={adminStats.revenueByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => [`₱${v.toLocaleString()}`, "Revenue"]} />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card className="border-card-border mt-3">
              <CardHeader><CardTitle className="text-base">Monthly Orders</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={orderData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="orders" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card className="border-card-border mt-3">
              <CardHeader><CardTitle className="text-base">User Growth by Month</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={userGrowth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="customers" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 4 }} name="Customers" />
                    <Line type="monotone" dataKey="sellers" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 4 }} name="Sellers" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories">
            <Card className="border-card-border mt-3">
              <CardHeader><CardTitle className="text-base">Products by Category</CardTitle></CardHeader>
              <CardContent className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={adminStats.categoryBreakdown} cx="50%" cy="50%" outerRadius={110} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine>
                      {adminStats.categoryBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
