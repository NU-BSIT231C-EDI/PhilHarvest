import { useState } from "react";
import { useRoute, Link } from "wouter";
import { Star, MapPin, ShoppingCart, Heart, ChevronRight, Shield, Truck, ArrowLeft, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import PublicLayout from "@/layouts/PublicLayout";
import ProductCard from "@/components/shared/ProductCard";
import { products, reviews, sellers } from "@/data/mockData";

export default function ProductDetail() {
  const [, params] = useRoute("/marketplace/:id");
  const [qty, setQty] = useState(1);
  const [inWishlist, setInWishlist] = useState(false);

  const product = products.find((p) => p.id === params?.id) || products[0];
  const productReviews = reviews.filter((r) => r.productId === product.id);
  const seller = sellers.find((s) => s.id === product.sellerId);
  const related = products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/marketplace" className="hover:text-primary transition-colors">Marketplace</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground">{product.name}</span>
        </nav>

        <Link href="/marketplace">
          <Button variant="ghost" size="sm" className="gap-1 mb-4 -ml-2">
            <ArrowLeft className="w-4 h-4" /> Back to Marketplace
          </Button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Image */}
          <div className="space-y-3">
            <div className="aspect-square rounded-2xl overflow-hidden bg-muted">
              <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
            </div>
          </div>

          {/* Info */}
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <Badge className="bg-secondary/20 text-secondary-foreground border-secondary/30 mb-2 capitalize">{product.category.replace("-", " ")}</Badge>
                <h1 className="text-3xl font-bold text-foreground">{product.name}</h1>
              </div>
              <button
                onClick={() => setInWishlist(!inWishlist)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${inWishlist ? "bg-destructive/10 border-destructive text-destructive" : "border-border hover:border-destructive hover:text-destructive"}`}
                data-testid="button-product-wishlist"
              >
                <Heart className="w-5 h-5" fill={inWishlist ? "currentColor" : "none"} />
              </button>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < Math.floor(product.rating) ? "fill-accent text-accent" : "text-muted"}`} />
                ))}
              </div>
              <span className="font-semibold text-sm">{product.rating}</span>
              <span className="text-sm text-muted-foreground">({product.reviewCount} reviews)</span>
            </div>

            <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{product.sellerRegion}</span>
            </div>

            <div className="mt-5">
              <span className="text-4xl font-extrabold text-primary">₱{product.price.toLocaleString()}</span>
              <span className="text-muted-foreground ml-2">per {product.unit}</span>
            </div>

            <div className="mt-2">
              <Badge variant={product.stock > 100 ? "secondary" : "destructive"} className="text-xs">
                {product.stock > 100 ? `${product.stock} ${product.unit}s in stock` : `Only ${product.stock} left`}
              </Badge>
            </div>

            <Separator className="my-5" />

            <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>

            {/* Qty + Cart */}
            <div className="mt-6 flex items-center gap-3">
              <div className="flex items-center border border-border rounded-lg">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-2 hover:bg-muted transition-colors" data-testid="button-qty-decrease">
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 text-sm font-semibold min-w-[40px] text-center" data-testid="text-quantity">{qty}</span>
                <button onClick={() => setQty(qty + 1)} className="p-2 hover:bg-muted transition-colors" data-testid="button-qty-increase">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <Button className="flex-1 gap-2 font-semibold" data-testid="button-add-to-cart">
                <ShoppingCart className="w-4 h-4" />
                Add to Cart — ₱{(product.price * qty).toLocaleString()}
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="w-4 h-4 text-secondary" />
                <span>Quality Guaranteed</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Truck className="w-4 h-4 text-secondary" />
                <span>Nationwide Delivery</span>
              </div>
            </div>

            {/* Seller Card */}
            {seller && (
              <div className="mt-6 p-4 bg-card border border-card-border rounded-xl">
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Sold by</p>
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-primary/20 text-primary font-bold text-sm">
                      {seller.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{seller.farmName}</p>
                    <p className="text-xs text-muted-foreground">{seller.province}, {seller.region}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star className="w-3 h-3 fill-accent text-accent" />
                      <span className="text-xs font-medium">{seller.rating}</span>
                      <span className="text-xs text-muted-foreground">· {seller.totalSales} sales</span>
                    </div>
                  </div>
                  {seller.verified && (
                    <Badge className="bg-secondary/20 text-secondary-foreground border-secondary/30 text-xs">Verified</Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reviews */}
        <div className="mt-12">
          <h2 className="text-xl font-bold text-foreground mb-5">Customer Reviews</h2>
          {productReviews.length === 0 ? (
            <p className="text-muted-foreground text-sm">No reviews yet.</p>
          ) : (
            <div className="space-y-4">
              {productReviews.map((r) => (
                <div key={r.id} className="bg-card border border-card-border rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="w-9 h-9">
                      <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                        {r.customerName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm">{r.customerName}</p>
                      <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}</p>
                    </div>
                    <div className="ml-auto flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? "fill-accent text-accent" : "text-muted"}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed">{r.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-foreground mb-5">Related Products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {related.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
