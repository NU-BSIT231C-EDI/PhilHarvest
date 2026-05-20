import { AlertTriangle, TrendingUp, Boxes, ShoppingCart, BarChart2, CheckCircle } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { inventoryForecasts } from "@/data/mockData";

const monthlySupply = [
  { month: "Jan", supply: 1200, demand: 1100, contracted: 800 },
  { month: "Feb", supply: 1350, demand: 1200, contracted: 800 },
  { month: "Mar", supply: 980, demand: 1400, contracted: 800 },
  { month: "Apr", supply: 1500, demand: 1600, contracted: 1600 },
  { month: "May", supply: 1400, demand: 2100, contracted: 2000 },
  { month: "Jun", supply: 1600, demand: 2200, contracted: 2000 },
];

const warehouseStatus = [
  { zone: "Zone A – Vegetables", capacity: 85, status: "High" },
  { zone: "Zone B – Fruits", capacity: 42, status: "Normal" },
  { zone: "Zone C – Root Crops", capacity: 91, status: "Critical" },
  { zone: "Zone D – Grains", capacity: 30, status: "Low" },
];

export default function SupplyPlanning() {
  const shortages = inventoryForecasts.filter((f) => f.forecastedShortage);
  const healthy = inventoryForecasts.filter((f) => !f.forecastedShortage);

  return (
    <DashboardLayout role="seller" title="Supply Planning">
      <div className="p-6 space-y-6">
        {/* Alert Banner */}
        {shortages.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800 text-sm">Predicted Stock Shortage Alert</p>
              <p className="text-sm text-red-700 mt-0.5">
                {shortages.length} product(s) are projected to run short based on contract demand:{" "}
                {shortages.map((s) => s.productName).join(", ")}.
              </p>
            </div>
          </div>
        )}

        {/* Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Products Monitored", value: inventoryForecasts.length, icon: Boxes, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Shortage Risks", value: shortages.length, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
            { label: "Healthy Stock", value: healthy.length, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
            { label: "Contracted Demand", value: "2,800 kg/mo", icon: ShoppingCart, color: "text-purple-600", bg: "bg-purple-50" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-5 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Supply vs Demand Chart */}
          <Card>
            <CardHeader><CardTitle className="text-base">Monthly Supply vs Demand (kg)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlySupply} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="supply" fill="#4ade80" name="Supply" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="demand" fill="#f87171" name="Demand" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="contracted" fill="#818cf8" name="Contracted" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Warehouse Preparation */}
          <Card>
            <CardHeader><CardTitle className="text-base">Warehouse Preparation Status</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {warehouseStatus.map((w) => (
                <div key={w.zone}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-foreground font-medium">{w.zone}</span>
                    <Badge className={
                      w.status === "Critical" ? "bg-red-100 text-red-700" :
                      w.status === "High" ? "bg-orange-100 text-orange-700" :
                      w.status === "Normal" ? "bg-green-100 text-green-700" :
                      "bg-blue-100 text-blue-700"
                    }>{w.status}</Badge>
                  </div>
                  <Progress value={w.capacity} className={`h-2 ${
                    w.capacity >= 90 ? "[&>div]:bg-red-500" :
                    w.capacity >= 70 ? "[&>div]:bg-orange-500" :
                    "[&>div]:bg-green-500"
                  }`} />
                  <p className="text-xs text-muted-foreground mt-1">{w.capacity}% capacity utilized</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Inventory Demand Forecast */}
        <Card>
          <CardHeader><CardTitle className="text-base">Inventory Demand Forecast</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Product", "Current Stock", "Projected Demand", "Reorder Point", "Recommended Order", "Status"].map((h) => (
                      <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inventoryForecasts.map((f) => (
                    <tr key={f.productId} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-3 font-medium text-foreground">{f.productName}</td>
                      <td className="py-3 px-3 text-foreground">{f.currentStock.toLocaleString()} {f.unit}</td>
                      <td className="py-3 px-3 text-foreground">{f.projectedDemand.toLocaleString()} {f.unit}</td>
                      <td className="py-3 px-3 text-foreground">{f.reorderPoint.toLocaleString()} {f.unit}</td>
                      <td className="py-3 px-3">
                        {f.forecastedShortage ? (
                          <span className="font-semibold text-red-600">+{f.recommendedOrder.toLocaleString()} {f.unit}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {f.forecastedShortage ? (
                          <Badge className="bg-red-100 text-red-700 border-red-200 gap-1">
                            <AlertTriangle className="w-3 h-3" /> Shortage Risk
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
                            <CheckCircle className="w-3 h-3" /> Adequate
                          </Badge>
                        )}
                      </td>
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
