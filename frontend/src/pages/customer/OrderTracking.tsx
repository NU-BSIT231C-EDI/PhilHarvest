import { useRoute, Link } from "wouter";
import { ArrowLeft, Package, CheckCircle, Truck, MapPin, Clock, Phone, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import DashboardLayout from "@/layouts/DashboardLayout";
import StatusBadge from "@/components/shared/StatusBadge";
import { orders } from "@/data/mockData";

const trackingSteps = [
  { key: "pending", label: "Order Placed", desc: "Your order has been received", icon: Package },
  { key: "processing", label: "Processing", desc: "Seller is preparing your order", icon: Clock },
  { key: "confirmed", label: "Confirmed", desc: "Order confirmed, ready for pickup", icon: CheckCircle },
  { key: "shipped", label: "Shipped", desc: "Your order is on its way", icon: Truck },
  { key: "out_for_delivery", label: "Out for Delivery", desc: "Driver is near your location", icon: MapPin },
  { key: "delivered", label: "Delivered", desc: "Order successfully delivered", icon: CheckCircle },
];

const statusOrder = ["pending", "processing", "confirmed", "shipped", "out_for_delivery", "delivered"];

const ediDocStyle: Record<string, string> = {
  sent:       "bg-green-100 text-green-700 border-green-200",
  pending:    "bg-yellow-100 text-yellow-700 border-yellow-200",
  not_issued: "bg-muted text-muted-foreground border-border",
};

const mockEdiDocs = [
  { label: "PO Acknowledgment (855)", status: "sent",       note: "Confirmed by seller" },
  { label: "Advance Ship Notice (856)", status: "pending",   note: "Awaiting shipment" },
  { label: "Invoice (810)",             status: "not_issued", note: "Not yet issued" },
];

export default function OrderTracking() {
  const [, params] = useRoute("/customer/orders/:id");
  const order = orders.find((o) => o.id === params?.id) || orders[0];
  const currentIdx = statusOrder.indexOf(order.status);

  return (
    <DashboardLayout role="customer" title="Order Tracking">
      <div className="p-6 space-y-5">
        <Link href="/customer/orders">
          <Button variant="ghost" size="sm" className="gap-1 -ml-2" data-testid="button-back-orders"><ArrowLeft className="w-4 h-4" /> Back to Orders</Button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Tracking Timeline */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-card-border">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-xs text-muted-foreground">Order Number</p>
                    <p className="font-bold text-foreground" data-testid="text-po-number">{order.poNumber}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                {order.trackingNumber && (
                  <div className="bg-muted/50 rounded-lg p-3 mb-5 text-sm">
                    <span className="text-muted-foreground">Tracking #: </span>
                    <span className="font-semibold" data-testid="text-tracking-number">{order.trackingNumber}</span>
                  </div>
                )}

                {/* Timeline */}
                <div className="space-y-0">
                  {trackingSteps.map((step, idx) => {
                    const isCompleted = idx <= currentIdx && order.status !== "cancelled";
                    const isCurrent = idx === currentIdx && order.status !== "cancelled";
                    const Icon = step.icon;
                    return (
                      <div key={step.key} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isCompleted ? isCurrent ? "bg-primary text-primary-foreground" : "bg-secondary/20 text-secondary" : "bg-muted text-muted-foreground"}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          {idx < trackingSteps.length - 1 && (
                            <div className={`w-0.5 h-8 mt-1 ${isCompleted && idx < currentIdx ? "bg-secondary/40" : "bg-muted"}`} />
                          )}
                        </div>
                        <div className="pb-6">
                          <p className={`text-sm font-semibold ${isCompleted ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</p>
                          <p className={`text-xs mt-0.5 ${isCompleted ? "text-muted-foreground" : "text-muted-foreground/50"}`}>{step.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card className="border-card-border">
              <CardContent className="p-5">
                <h3 className="font-bold text-foreground mb-3">Order Items</h3>
                <div className="space-y-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm py-2 border-b border-border last:border-0">
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">{item.quantity} {item.unit} × ₱{item.unitPrice}</p>
                      </div>
                      <p className="font-bold text-primary">₱{item.lineTotal.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                <Separator className="my-3" />
                <div className="flex justify-between font-bold"><span>Total</span><span className="text-primary">₱{order.totalAmount.toLocaleString()}</span></div>
              </CardContent>
            </Card>
          </div>

          {/* Delivery Info */}
          <div className="space-y-4">
            <Card className="border-card-border">
              <CardContent className="p-5 space-y-3">
                <h3 className="font-bold text-foreground">Delivery Info</h3>
                <div>
                  <p className="text-xs text-muted-foreground">Deliver to</p>
                  <p className="text-sm font-medium mt-0.5">{order.customerName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{order.shippingAddress}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground">Payment Method</p>
                  <p className="text-sm font-medium mt-0.5">{order.paymentMethod}</p>
                </div>
                {order.deliveryDate && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground">Delivery Date</p>
                      <p className="text-sm font-medium mt-0.5">{order.deliveryDate}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            <Card className="border-card-border">
              <CardContent className="p-5">
                <h3 className="font-bold text-foreground mb-3">Seller</h3>
                <p className="text-sm font-medium">{order.sellerName}</p>
                <Button variant="outline" size="sm" className="gap-2 mt-3 w-full" data-testid="button-contact-seller">
                  <Phone className="w-3.5 h-3.5" /> Contact Seller
                </Button>
              </CardContent>
            </Card>

            <Card className="border-card-border">
              <CardContent className="p-5 space-y-3">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <ScrollText className="w-4 h-4 text-primary" />
                  EDI Document Status
                </h3>
                {mockEdiDocs.map((doc) => (
                  <div key={doc.label} className="flex items-center justify-between gap-2" data-testid={`edi-doc-${doc.status}`}>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{doc.label}</p>
                      <p className="text-xs text-muted-foreground">{doc.note}</p>
                    </div>
                    <Badge className={`text-xs border shrink-0 capitalize ${ediDocStyle[doc.status]}`}>
                      {doc.status.replace("_", " ")}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
