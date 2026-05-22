import { Building2, Clock, CheckCircle, FileText, ChevronRight } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const mockPending = [
  { id: "OB-001", company: "AgriMart Cebu Inc.",       type: "Big Business", submitted: "2026-05-20", contact: "mark.lim@agrimart.ph" },
  { id: "OB-002", company: "Davao Fresh Distributors", type: "Big Business", submitted: "2026-05-21", contact: "ops@davaofresh.ph" },
];

const mockOnboarded = [
  { id: "OB-000", company: "FreshMart Philippines Inc.", type: "Big Business", onboarded: "2026-04-01" },
  { id: "OB-099", company: "Jollibee Foods Corporation", type: "Big Business", onboarded: "2026-03-15" },
];

export default function AdminOnboarding() {
  return (
    <DashboardLayout role="admin" title="Company Onboarding">
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: "Pending Review",    value: mockPending.length,   icon: Clock,         color: "text-orange-600", bg: "bg-orange-50" },
            { label: "Onboarded",         value: mockOnboarded.length, icon: CheckCircle,   color: "text-green-600",  bg: "bg-green-50" },
            { label: "Contract Templates",value: 3,                    icon: FileText,      color: "text-blue-600",   bg: "bg-blue-50" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
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

        {/* Pending Onboarding */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
              Pending Onboarding ({mockPending.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockPending.map((co) => (
              <div key={co.id} className="flex items-center justify-between gap-3 border border-orange-200 bg-orange-50/40 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-border flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{co.company}</p>
                    <p className="text-xs text-muted-foreground">{co.contact} · Submitted {co.submitted}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">{co.type}</Badge>
                  <Button size="sm" variant="outline" className="gap-1 text-xs" data-testid={`button-review-${co.id}`}>
                    Review <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Onboarded Companies */}
        <Card>
          <CardHeader><CardTitle className="text-base">Active Companies</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {mockOnboarded.map((co) => (
              <div key={co.id} className="flex items-center justify-between gap-3 border border-border rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-green-50 border border-green-200 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{co.company}</p>
                    <p className="text-xs text-muted-foreground">Onboarded {co.onboarded}</p>
                  </div>
                </div>
                <Badge className="bg-muted text-xs">{co.type}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          Contract template editor and full onboarding workflow coming soon.
        </p>
      </div>
    </DashboardLayout>
  );
}
