import { Star, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import DashboardLayout from "@/layouts/DashboardLayout";
import { reviews } from "@/data/mockData";

export default function SellerReviewsPage() {
  const avgRating = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  const ratingCounts = [5, 4, 3, 2, 1].map((star) => ({ star, count: reviews.filter((r) => r.rating === star).length }));

  return (
    <DashboardLayout role="seller" title="Reviews & Ratings">
      <div className="p-6 space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Card className="border-card-border md:col-span-1">
            <CardContent className="p-5 text-center">
              <p className="text-5xl font-extrabold text-primary">{avgRating.toFixed(1)}</p>
              <div className="flex justify-center gap-1 mt-2">
                {[...Array(5)].map((_, i) => <Star key={i} className={`w-5 h-5 ${i < Math.round(avgRating) ? "fill-accent text-accent" : "text-muted"}`} />)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{reviews.length} reviews</p>
            </CardContent>
          </Card>
          <Card className="border-card-border md:col-span-2">
            <CardContent className="p-5 space-y-2.5">
              {ratingCounts.map(({ star, count }) => (
                <div key={star} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-12">
                    <span className="text-sm font-medium">{star}</span>
                    <Star className="w-3.5 h-3.5 fill-accent text-accent" />
                  </div>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full" style={{ width: `${reviews.length ? (count / reviews.length) * 100 : 0}%` }} />
                  </div>
                  <span className="text-sm text-muted-foreground w-6 text-right">{count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Reviews List */}
        <div className="space-y-3">
          {reviews.map((r) => (
            <Card key={r.id} className="border-card-border" data-testid={`card-review-${r.id}`}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <Avatar className="w-9 h-9">
                    <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                      {r.customerName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm">{r.customerName}</p>
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? "fill-accent text-accent" : "text-muted"}`} />)}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.productName} · {new Date(r.createdAt).toLocaleDateString("en-PH")}</p>
                    <p className="text-sm text-foreground/80 mt-2 leading-relaxed">{r.comment}</p>
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
