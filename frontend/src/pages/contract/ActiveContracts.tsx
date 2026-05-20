import { useState } from "react";
import { Link } from "wouter";
import { PlusCircle, Search, Eye, RefreshCw, FileText } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useContractStore } from "@/store";
import type { ContractStatus } from "@/types";

const statusColor: Record<ContractStatus, string> = {
  active: "bg-green-100 text-green-700 border-green-200",
  approved: "bg-blue-100 text-blue-700 border-blue-200",
  negotiating: "bg-yellow-100 text-yellow-700 border-yellow-200",
  pending: "bg-orange-100 text-orange-700 border-orange-200",
  expired: "bg-gray-100 text-gray-700 border-gray-200",
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};

const paymentStatusColor: Record<string, string> = {
  current: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  pending: "bg-yellow-100 text-yellow-700",
};

function getRemainingMonths(endDate: string) {
  const end = new Date(endDate);
  const now = new Date();
  const diff = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
  return Math.max(0, diff);
}

export default function ActiveContracts() {
  const { contracts } = useContractStore();
  const myContracts = contracts.filter((c) => c.customerId === "u8");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ContractStatus | "all">("all");

  const filtered = myContracts.filter((c) => {
    const matchSearch =
      c.contractNumber.toLowerCase().includes(search.toLowerCase()) ||
      c.sellerName.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || c.status === filter;
    return matchSearch && matchFilter;
  });

  const filterOptions: (ContractStatus | "all")[] = ["all", "active", "approved", "negotiating", "pending", "expired"];

  return (
    <DashboardLayout role="contract" title="My Contracts">
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">Supply Contracts</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{myContracts.length} total contracts</p>
          </div>
          <Link href="/contract/contracts/new">
            <Button className="gap-2" data-testid="button-new-contract">
              <PlusCircle className="w-4 h-4" /> New Contract Request
            </Button>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search contracts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {filterOptions.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize ${
                  filter === f
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary hover:text-primary"
                }`}
              >
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          {filtered.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">No contracts found.</CardContent>
            </Card>
          )}
          {filtered.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-foreground">{c.contractNumber}</p>
                          <Badge className={`text-xs border ${statusColor[c.status]}`}>{c.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Supplier: {c.sellerName}</p>
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${paymentStatusColor[c.paymentStatus]}`}>
                        Payment: {c.paymentStatus}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Contract Value</p>
                        <p className="font-semibold text-foreground">₱{c.totalContractValue.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Duration</p>
                        <p className="font-semibold text-foreground">{c.duration} months</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Start Date</p>
                        <p className="font-semibold text-foreground">{c.startDate}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">End Date</p>
                        <p className="font-semibold text-foreground">{c.endDate}</p>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                        <span>Delivery Completion</span>
                        <span>{c.deliveryCompletionPercent}%</span>
                      </div>
                      <Progress value={c.deliveryCompletionPercent} className="h-2" />
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Remaining: <span className="font-medium text-foreground">{getRemainingMonths(c.endDate)} months</span>
                      &nbsp;&bull;&nbsp; Payment Terms: {c.paymentTerms}
                    </div>
                  </div>

                  <div className="flex lg:flex-col gap-2 lg:min-w-[120px]">
                    <Link href={`/contract/contracts/${c.id}`} className="flex-1 lg:flex-none">
                      <Button variant="outline" size="sm" className="w-full gap-1" data-testid={`button-view-contract-${c.id}`}>
                        <Eye className="w-3.5 h-3.5" /> View
                      </Button>
                    </Link>
                    {(c.status === "active" || c.status === "approved") && getRemainingMonths(c.endDate) <= 2 && (
                      <Link href={`/contract/renewals?id=${c.id}`} className="flex-1 lg:flex-none">
                        <Button size="sm" className="w-full gap-1" data-testid={`button-renew-${c.id}`}>
                          <RefreshCw className="w-3.5 h-3.5" /> Renew
                        </Button>
                      </Link>
                    )}
                    <Button variant="ghost" size="sm" className="w-full gap-1 text-muted-foreground" data-testid={`button-download-${c.id}`}>
                      <FileText className="w-3.5 h-3.5" /> PDF
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
