import { useState } from "react";
import { Handshake, TrendingUp, Clock, AlertTriangle, CheckCircle, Search } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useContractStore } from "@/store";
import type { ContractStatus } from "@/types";

const statusColor: Record<ContractStatus, string> = {
  active: "bg-green-100 text-green-700 border-green-200",
  approved: "bg-blue-100 text-blue-700 border-blue-200",
  negotiating: "bg-yellow-100 text-yellow-700 border-yellow-200",
  pending: "bg-orange-100 text-orange-700 border-orange-200",
  expired: "bg-gray-100 text-gray-600 border-gray-200",
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};

const PIE_COLORS = ["#22c55e", "#3b82f6", "#eab308", "#f97316", "#6b7280", "#94a3b8", "#ef4444"];

function getRemainingMonths(endDate: string) {
  const end = new Date(endDate);
  const now = new Date();
  return Math.max(0, (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth()));
}

export default function AdminContractMonitoring() {
  const { contracts } = useContractStore();
  const [search, setSearch] = useState("");

  const filtered = contracts.filter((c) =>
    c.contractNumber.toLowerCase().includes(search.toLowerCase()) ||
    c.companyName.toLowerCase().includes(search.toLowerCase()) ||
    c.sellerName.toLowerCase().includes(search.toLowerCase())
  );

  const totalValue = contracts.filter((c) => c.status === "active").reduce((s, c) => s + c.totalContractValue, 0);
  const expiring = contracts.filter((c) => c.status === "active" && getRemainingMonths(c.endDate) <= 2);

  const statusBreakdown = ["active", "approved", "negotiating", "pending", "expired"].map((s) => ({
    name: s,
    value: contracts.filter((c) => c.status === s).length,
  })).filter((s) => s.value > 0);

  const valueBySupplier = contracts
    .filter((c) => c.status === "active")
    .reduce<Record<string, number>>((acc, c) => {
      acc[c.sellerName] = (acc[c.sellerName] || 0) + c.totalContractValue;
      return acc;
    }, {});

  const supplierChartData = Object.entries(valueBySupplier).map(([name, value]) => ({
    name: name.split(" ").slice(0, 2).join(" "),
    value,
  }));

  return (
    <DashboardLayout role="admin" title="Contract Monitoring">
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Contracts", value: contracts.length, icon: Handshake, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Active Value", value: `₱${(totalValue / 1000).toFixed(0)}K`, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
            { label: "Pending Review", value: contracts.filter((c) => c.status === "pending").length, icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
            { label: "Expiring Soon", value: expiring.length, icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Status Breakdown */}
          <Card>
            <CardHeader><CardTitle className="text-base">Contract Status Distribution</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                    {statusBreakdown.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Value by Supplier */}
          <Card>
            <CardHeader><CardTitle className="text-base">Active Contract Value by Supplier</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={supplierChartData} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: number) => `₱${v.toLocaleString()}`} />
                  <Bar dataKey="value" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Expiring Soon */}
        {expiring.length > 0 && (
          <Card className="border-orange-200">
            <CardHeader><CardTitle className="text-base text-orange-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Contracts Expiring Soon</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {expiring.map((c) => (
                <div key={c.id} className="flex items-center justify-between border border-orange-200 bg-orange-50/50 rounded-lg p-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{c.contractNumber}</p>
                    <p className="text-xs text-muted-foreground">{c.companyName} · {c.sellerName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-orange-700">{getRemainingMonths(c.endDate)} months left</p>
                    <p className="text-xs text-muted-foreground">Ends {c.endDate}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Contracts Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-base">All Contracts</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8 text-sm" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Contract #", "Buyer", "Supplier", "Value", "Progress", "Status", "End Date"].map((h) => (
                      <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-3 font-mono text-xs text-foreground">{c.contractNumber}</td>
                      <td className="py-3 px-3 text-foreground text-xs">{c.companyName}</td>
                      <td className="py-3 px-3 text-foreground text-xs">{c.sellerName}</td>
                      <td className="py-3 px-3 font-semibold text-foreground">₱{c.totalContractValue.toLocaleString()}</td>
                      <td className="py-3 px-3 w-28">
                        <Progress value={c.deliveryCompletionPercent} className="h-1.5" />
                        <span className="text-xs text-muted-foreground">{c.deliveryCompletionPercent}%</span>
                      </td>
                      <td className="py-3 px-3">
                        <Badge className={`text-xs border ${statusColor[c.status]}`}>{c.status}</Badge>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground text-xs">{c.endDate}</td>
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
