import { useEffect, useState, useCallback } from "react";
import { usePolling } from "@/hooks/use-polling";
import { Link } from "wouter";
import { FileCheck2, Clock, CheckCircle2, Send, ArrowRight, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/layouts/DashboardLayout";
import StatsCard from "@/components/shared/StatsCard";
import StatusBadge from "@/components/shared/StatusBadge";
import {
  fetchTransactions,
  typeLabel,
  mapStatus,
  formatDate,
  type BackendTransaction,
} from "@/services/ediApi";

type EdiStatus = "validated" | "delivered" | "pending" | "error";

const typeColors: Record<string, string> = {
  "850": "bg-blue-50 text-blue-700 border-blue-200",
  "855": "bg-green-50 text-green-700 border-green-200",
  "856": "bg-purple-50 text-purple-700 border-purple-200",
  "810": "bg-amber-50 text-amber-700 border-amber-200",
  "997": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "204": "bg-orange-50 text-orange-700 border-orange-200",
  "990": "bg-teal-50 text-teal-700 border-teal-200",
};

// Derive weekly chart data from transactions (last 7 calendar days)
function buildVolumeData(txns: BackendTransaction[]) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    const prefix = d.toISOString().slice(0, 10);
    const slice = txns.filter((t) => t.created_at.startsWith(prefix));
    return {
      day: days[d.getDay()],
      sent: slice.filter((t) => t.direction === 'outbound').length,
      received: slice.filter((t) => t.direction === 'inbound').length,
    };
  });
}

// Compute top-4 type breakdown from transactions
function buildTypeBreakdown(txns: BackendTransaction[]) {
  const counts: Record<string, number> = {};
  for (const t of txns) counts[t.transaction_type] = (counts[t.transaction_type] || 0) + 1;
  const total = txns.length || 1;
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([type, count]) => ({ type, label: typeLabel(type), count, pct: Math.round((count / total) * 100) }));
}

export default function EdiDashboard() {
  const [txns, setTxns] = useState<BackendTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    fetchTransactions()
      .then((data) => { setTxns(data); if (!silent) setError(null); })
      .catch((err) => { if (!silent) setError(err.message); })
      .finally(() => { if (!silent) setLoading(false); });
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  usePolling(() => loadData(true), 10_000);

  // ─── Derived stats ────────────────────────────────────────────────────────
  const delivered     = txns.filter((t) => t.status === 'SENT').length;
  const pending       = txns.filter((t) => t.status === 'PENDING' || t.status === 'RETRYING').length;
  const failed        = txns.filter((t) => t.status === 'FAILED').length;
  const validated     = txns.filter((t) => t.direction === 'inbound' && t.status === 'SENT').length;
  const outboundSent  = txns.filter((t) => t.direction === 'outbound' && t.status === 'SENT').length;
  const alertCount    = pending + failed;

  const recentDocs = txns.slice(0, 6).map((t) => ({
    id:      `EDI-${String(t.id).padStart(4, '0')}`,
    type:    t.transaction_type,
    label:   typeLabel(t.transaction_type),
    company: t.partner_id,
    status:  mapStatus(t.status) as EdiStatus,
    date:    formatDate(t.created_at).slice(0, 10),
  }));

  const volumeData    = buildVolumeData(txns);
  const maxVol        = Math.max(...volumeData.map((d) => Math.max(d.sent, d.received)), 1);
  const typeBreakdown = buildTypeBreakdown(txns);

  return (
    <DashboardLayout role="admin" title="EDI Dashboard">
      <div className="p-6 space-y-6">

        {/* Alert — shows live pending/failed count */}
        {!loading && alertCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {alertCount} document{alertCount !== 1 ? 's' : ''} require attention
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                {failed > 0 && `${failed} failed`}{failed > 0 && pending > 0 && ' · '}{pending > 0 && `${pending} pending`} — check the Transactions page for details.
              </p>
            </div>
          </div>
        )}

        {/* API error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">Could not load EDI data: {error}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard label="Delivered"     value={loading ? 0 : delivered}    icon={FileCheck2}   iconBg="bg-green-50"  iconColor="text-green-600"  />
          <StatsCard label="Pending"       value={loading ? 0 : pending}      icon={Clock}        iconBg="bg-amber-50"  iconColor="text-amber-600"  />
          <StatsCard label="Validated"     value={loading ? 0 : validated}    icon={CheckCircle2} iconBg="bg-blue-50"   iconColor="text-blue-600"   />
          <StatsCard label="Outbound Sent" value={loading ? 0 : outboundSent} icon={Send}         iconBg="bg-purple-50" iconColor="text-purple-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Weekly Volume Chart */}
          <Card className="border-card-border lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Weekly Document Volume</CardTitle>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-primary inline-block" />Sent</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-secondary inline-block" />Received</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-40">
                {volumeData.map((d) => (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end gap-0.5 h-32">
                      <div
                        className="flex-1 bg-primary rounded-t-md"
                        style={{ height: `${(d.sent / maxVol) * 100}%` }}
                        title={`Sent: ${d.sent}`}
                      />
                      <div
                        className="flex-1 bg-secondary/70 rounded-t-md"
                        style={{ height: `${(d.received / maxVol) * 100}%` }}
                        title={`Received: ${d.received}`}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{d.day}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Doc Type Breakdown */}
          <Card className="border-card-border">
            <CardHeader><CardTitle className="text-base">By Document Type</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {loading
                ? <p className="text-xs text-muted-foreground">Loading…</p>
                : typeBreakdown.length === 0
                  ? <p className="text-xs text-muted-foreground">No transactions yet.</p>
                  : typeBreakdown.map((r) => (
                    <div key={r.type}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-foreground">{r.type} — {r.label}</span>
                        <span className="text-muted-foreground">{r.count}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${r.pct}%` }} />
                      </div>
                    </div>
                  ))
              }
            </CardContent>
          </Card>
        </div>

        {/* Recent Documents */}
        <Card className="border-card-border">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Documents</CardTitle>
            <Link href="/admin/edi/transactions">
              <Button variant="ghost" size="sm" className="gap-1 text-primary text-xs">View All <ArrowRight className="w-3.5 h-3.5" /></Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Doc ID</th>
                    <th className="text-left pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                    <th className="text-left pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Company</th>
                    <th className="text-left pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="text-right pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading
                    ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-xs text-muted-foreground">Loading transactions…</td>
                      </tr>
                    )
                    : recentDocs.length === 0
                      ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-xs text-muted-foreground">No recent documents found.</td>
                        </tr>
                      )
                      : recentDocs.map((doc) => (
                        <tr key={doc.id} className="hover:bg-muted/30 transition-colors" data-testid={`row-edi-${doc.id}`}>
                          <td className="py-2.5 font-mono text-xs font-semibold text-foreground">{doc.id}</td>
                          <td className="py-2.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-bold ${typeColors[doc.type] ?? "bg-muted text-muted-foreground"}`}>
                              {doc.type}
                            </span>
                            <span className="ml-2 text-xs text-muted-foreground hidden sm:inline">{doc.label}</span>
                          </td>
                          <td className="py-2.5 text-xs text-foreground">{doc.company}</td>
                          <td className="py-2.5"><StatusBadge status={doc.status} /></td>
                          <td className="py-2.5 text-right text-xs text-muted-foreground">{doc.date}</td>
                        </tr>
                      ))
                  }
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
