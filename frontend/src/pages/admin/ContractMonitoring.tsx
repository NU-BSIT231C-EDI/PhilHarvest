import { useState } from "react";
import { useLocation } from "wouter";
import { Handshake, TrendingUp, Clock, AlertTriangle, Plus, Search } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useContractStore } from "@/store";
import type { ContractStatus } from "@/types";

const statusColor: Record<ContractStatus, string> = {
  active:      "bg-green-100 text-green-700 border-green-200",
  approved:    "bg-blue-100 text-blue-700 border-blue-200",
  negotiating: "bg-yellow-100 text-yellow-700 border-yellow-200",
  pending:     "bg-orange-100 text-orange-700 border-orange-200",
  expired:     "bg-gray-100 text-gray-600 border-gray-200",
  draft:       "bg-slate-100 text-slate-600 border-slate-200",
  rejected:    "bg-red-100 text-red-700 border-red-200",
};

const PIE_COLORS = ["#22c55e", "#3b82f6", "#eab308", "#f97316", "#6b7280", "#94a3b8", "#ef4444"];

function getRemainingMonths(endDate: string) {
  const end = new Date(endDate);
  const now = new Date();
  return Math.max(0, (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth()));
}

const ALL_STATUSES: ContractStatus[] = ["draft", "pending", "negotiating", "approved", "active", "expired", "rejected"];

export default function AdminContractMonitoring() {
  const [, navigate] = useLocation();
  const { contracts } = useContractStore();
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState("all");
  const [dateFrom, setDateFrom]     = useState("");
  const [dateTo, setDateTo]         = useState("");

  const filtered = contracts.filter((c) => {
    const matchSearch = (
      c.contractNumber.toLowerCase().includes(search.toLowerCase()) ||
      c.companyName.toLowerCase().includes(search.toLowerCase()) ||
      c.sellerName.toLowerCase().includes(search.toLowerCase())
    );
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    const matchFrom   = !dateFrom || c.startDate >= dateFrom;
    const matchTo     = !dateTo   || c.endDate   <= dateTo;
    return matchSearch && matchStatus && matchFrom && matchTo;
  });

  const totalValue = contracts.filter((c) => c.status === "active").reduce((s, c) => s + c.totalContractValue, 0);
  const expiring   = contracts.filter((c) => c.status === "active" && getRemainingMonths(c.endDate) <= 2);

  const statusBreakdown = ALL_STATUSES.map((s) => ({
    name: s, value: contracts.filter((c) => c.status === s).length,
  })).filter((s) => s.value > 0);

  const valueBySupplier = contracts
    .filter((c) => c.status === "active")
    .reduce<Record<string, number>>((acc, c) => {
      acc[c.sellerName] = (acc[c.sellerName] || 0) + c.totalContractValue;
      return acc;
    }, {});

  const supplierChartData = Object.entries(valueBySupplier).map(([name, value]) => ({
    name: name.split(" ").slice(0, 2).join(" "), value,
  }));

  return (
    <DashboardLayout role="admin" title="Contract Monitoring">
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Contracts",  value: contracts.length,                                    icon: Handshake,    color: "text-blue-600",   bg: "bg-blue-50" },
            { label: "Active Value",     value: `₱${(totalValue / 1000).toFixed(0)}K`,              icon: TrendingUp,   color: "text-green-600",  bg: "bg-green-50" },
            { label: "Pending Review",   value: contracts.filter((c) => c.status === "pending").length, icon: Clock,    color: "text-yellow-600", bg: "bg-yellow-50" },
            { label: "Expiring Soon",    value: expiring.length,                                     icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50" },
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
          <Card>
            <CardHeader><CardTitle className="text-base">Status Distribution</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                    {statusBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
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
                <button key={c.id} onClick={() => navigate(`/admin/contracts/${c.id}`)}
                  className="w-full flex items-center justify-between border border-orange-200 bg-orange-50/50 rounded-lg p-3 hover:bg-orange-100/60 transition-colors text-left">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{c.contractNumber}</p>
                    <p className="text-xs text-muted-foreground">{c.companyName} · {c.sellerName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-orange-700">{getRemainingMonths(c.endDate)} months left</p>
                    <p className="text-xs text-muted-foreground">Ends {c.endDate}</p>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Table with filters */}
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle className="text-base">All Contracts</CardTitle>
              <Button size="sm" className="gap-2" onClick={() => navigate("/admin/onboarding")} data-testid="button-new-contract">
                <Plus className="w-3.5 h-3.5" /> New Contract
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search by contract, company, seller..." value={search}
                  onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8 text-sm" />
              </div>
              <Select value={statusFilter} onValueChange={setStatus}>
                <SelectTrigger className="w-full sm:w-40 h-8 text-sm" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {ALL_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                className="w-full sm:w-36 h-8 text-sm" title="Start date from" />
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className="w-full sm:w-36 h-8 text-sm" title="End date to" />
            </div>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <div className="py-10 text-center">
                <Handshake className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">No contracts match your filters</p>
                <p className="text-xs text-muted-foreground mt-1">Try adjusting the search or filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["Contract #", "Company", "Seller", "Value", "Progress", "Status", "Ends"].map((h) => (
                        <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c) => (
                      <tr key={c.id}
                        className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => navigate(`/admin/contracts/${c.id}`)}
                        data-testid={`row-contract-${c.id}`}>
                        <td className="py-3 px-3 font-mono text-xs text-foreground">{c.contractNumber}</td>
                        <td className="py-3 px-3 text-xs">{c.companyName}</td>
                        <td className="py-3 px-3 text-xs text-muted-foreground">{c.sellerName}</td>
                        <td className="py-3 px-3 font-semibold text-sm">₱{c.totalContractValue.toLocaleString()}</td>
                        <td className="py-3 px-3 w-28">
                          <Progress value={c.deliveryCompletionPercent} className="h-1.5" />
                          <span className="text-xs text-muted-foreground">{c.deliveryCompletionPercent}%</span>
                        </td>
                        <td className="py-3 px-3">
                          <Badge className={`text-xs border capitalize ${statusColor[c.status]}`}>{c.status}</Badge>
                        </td>
                        <td className="py-3 px-3 text-xs text-muted-foreground">{c.endDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
