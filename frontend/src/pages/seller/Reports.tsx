import { Download, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import DashboardLayout from "@/layouts/DashboardLayout";
import StatsCard from "@/components/shared/StatsCard";
import { sellerStats } from "@/data/mockData";
import { Package, Star } from "lucide-react";

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"];

export default function SellerReports() {
  return (
    <DashboardLayout role="seller" title="Sales Reports">
      <div className="p-6 space-y-5">
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground text-sm">May 2024</p>
          <Button variant="outline" size="sm" className="gap-2" data-testid="button-export"><Download className="w-4 h-4" />Export Report</Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard label="Total Revenue" value="₱125,600" icon={TrendingUp} trend={12} trendLabel="vs last month" iconBg="bg-green-50" iconColor="text-green-600" />
          <StatsCard label="Total Orders" value={84} icon={Package} trend={8} iconBg="bg-blue-50" iconColor="text-blue-600" />
          <StatsCard label="Avg Order Value" value="₱1,495" icon={TrendingUp} iconBg="bg-amber-50" iconColor="text-amber-600" />
          <StatsCard label="Avg Rating" value="4.8" icon={Star} iconBg="bg-purple-50" iconColor="text-purple-600" />
        </div>

        <Tabs defaultValue="revenue">
          <TabsList>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
          </TabsList>
          <TabsContent value="revenue">
            <Card className="border-card-border mt-3">
              <CardHeader><CardTitle className="text-base">Weekly Revenue</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={sellerStats.revenueByWeek}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => [`₱${v.toLocaleString()}`, "Revenue"]} />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="products">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-3">
              <Card className="border-card-border">
                <CardHeader><CardTitle className="text-base">Top Selling Products</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={sellerStats.topProducts} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="sales" fill="hsl(var(--secondary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="border-card-border">
                <CardHeader><CardTitle className="text-base">Sales by Category</CardTitle></CardHeader>
                <CardContent className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={[{ name: "Vegetables", value: 65 }, { name: "Root Crops", value: 20 }, { name: "Fruits", value: 15 }]} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                        {[0, 1, 2].map((i) => <Cell key={i} fill={COLORS[i]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
