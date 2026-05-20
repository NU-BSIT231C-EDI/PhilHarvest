import { Star, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/layouts/DashboardLayout";
import EmptyState from "@/components/shared/EmptyState";
import { reviews } from "@/data/mockData";

const myReviews = reviews.filter((r) => r.customerId === "u1");

export default function CustomerReviews() {
  return (
    <DashboardLayout role="customer" title="My Reviews">
      <div className="p-6 space-y-4">
        {myReviews.length === 0 ? (
          <EmptyState icon={MessageSquare} title="No reviews yet" description="Leave a review after receiving your orders." />
        ) : (
          myReviews.map((r) => (
            <Card key={r.id} className="border-card-border" data-testid={`card-review-${r.id}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{r.productName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{new Date(r.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}</p>
                  </div>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < r.rating ? "fill-accent text-accent" : "text-muted"}`} />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{r.comment}</p>
                <Button variant="ghost" size="sm" className="mt-3 text-xs text-muted-foreground hover:text-foreground" data-testid={`button-edit-review-${r.id}`}>Edit Review</Button>
              </CardContent>
            </Card>
          ))
        )}

        <div className="pt-2">
          <p className="text-sm text-muted-foreground">Have delivered orders waiting for your review?</p>
          <Button variant="outline" className="mt-2" data-testid="button-pending-reviews">View Pending Reviews</Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
