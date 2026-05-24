import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { ArrowRight, Leaf, Shield, Truck, Star, Users, Package, ChevronRight, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PublicLayout from "@/layouts/PublicLayout";
import ProductCard from "@/components/shared/ProductCard";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { fetchProducts, type ApiProduct } from "@/services/productsApi";
import type { Product } from "@/types";

function apiToProduct(p: ApiProduct): Product {
  return {
    id: String(p.id),
    name: p.name,
    category: p.category ?? "other",
    description: p.description ?? "",
    price: parseFloat(p.unit_price),
    unit: p.unit_of_measure,
    stock: p.stock_quantity,
    sellerId: p.seller_name ?? "unknown",
    sellerName: p.seller_name ?? "Unknown Seller",
    sellerRegion: "Philippines",
    images: p.image_url ? [p.image_url] : [],
    rating: 0,
    reviewCount: 0,
    status: p.is_active ? "active" : "inactive",
    featured: false,
    createdAt: p.created_at,
  };
}

const categoryIcons: Record<string, string> = {
  vegetables: "🥬",
  fruits: "🍎",
  "root-crops": "🥔",
  seedlings: "🌱",
  grains: "🌾",
};

const testimonials = [
  { name: "Chef Marco Reyes", role: "Restaurant Owner, BGC", quote: "PhilHarvest changed how we source ingredients. Fresh from the farm, next-day delivery — it's a game changer for our kitchen.", avatar: "MR" },
  { name: "Ate Lita Pascual", role: "Home Cook, Quezon City", quote: "Napaka-fresh ng mga gulay! And knowing it comes directly from the farmers makes me feel good about my purchases.", avatar: "LP" },
  { name: "Ruben Alcantara", role: "Food Manufacturer, Laguna", quote: "We now source all our raw materials through PhilHarvest. Consistent quality and reliable supply.", avatar: "RA" },
];

export default function Home() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const { addToCart } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts({ active: true, per_page: 100 })
      .then((page) => setAllProducts(page.data.map(apiToProduct)))
      .catch(() => {});
  }, []);

  const featuredProducts = allProducts.slice(0, 8);

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of allProducts) map.set(p.category, (map.get(p.category) ?? 0) + 1);
    return Array.from(map.entries()).map(([id, productCount]) => ({
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, " "),
      productCount,
    }));
  }, [allProducts]);

  function handleAddToCart(product: Parameters<typeof addToCart>[0]) {
    addToCart(product);
    toast({ title: "Added to cart", description: `${product.name} added to your cart.` });
  }

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary/5 via-background to-secondary/5 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-2xl">
            <Badge className="bg-accent/20 text-accent-foreground border-accent/30 mb-4 font-medium">
              Fresh from Philippine Farms
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground leading-tight">
              From Filipino Farms <br className="hidden sm:block" />
              <span className="text-primary">Straight to Your Table</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-xl">
              PhilHarvest connects farmers from Benguet to Davao with buyers across the Philippines. Fresh produce, fair prices, and reliable delivery — every day.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link href="/select-type">
                <Button size="lg" className="gap-2 text-base font-semibold" data-testid="button-hero-shop">
                  Shop Fresh Produce
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/register">
                <Button size="lg" variant="outline" className="gap-2 text-base font-semibold" data-testid="button-hero-sell">
                  Sell With Us
                  <Leaf className="w-4 h-4" />
                </Button>
              </Link>
            </div>
            <div className="mt-4">
              <Link href="/admin/dashboard">
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground text-xs" data-testid="button-admin-portal">
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  Admin Portal
                </Button>
              </Link>
            </div>
            {/* Stats */}
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
              {[
                { label: "Registered Farmers", value: "2,400+" },
                { label: "Products Available", value: "1,200+" },
                { label: "Orders Delivered", value: "50,000+" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-2xl font-bold text-primary">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="absolute right-0 top-0 w-1/2 h-full hidden lg:block">
          <img
            src="https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&q=80"
            alt="Fresh Philippine produce"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-transparent to-background" />
        </div>
      </section>

      {/* Categories */}
      <section className="py-14 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Browse by Category</h2>
              <p className="text-muted-foreground text-sm mt-1">Find fresh produce by type</p>
            </div>
            <Link href="/marketplace">
              <Button variant="ghost" size="sm" className="gap-1 text-primary">
                View All <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/marketplace?category=${cat.id}`}
                className="group bg-card border border-card-border rounded-xl p-5 text-center hover:border-primary hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                data-testid={`link-category-${cat.id}`}
              >
                <div className="text-4xl mb-3">{categoryIcons[cat.id] || "🌿"}</div>
                <p className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">{cat.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{cat.productCount} products</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-14 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Featured Products</h2>
              <p className="text-muted-foreground text-sm mt-1">Handpicked fresh from the farm</p>
            </div>
            <Link href="/marketplace">
              <Button variant="ghost" size="sm" className="gap-1 text-primary">
                See All <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {featuredProducts.map((p) => (
              <ProductCard key={p.id} product={p} onAddToCart={handleAddToCart} />
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-foreground">How PhilHarvest Works</h2>
            <p className="text-muted-foreground mt-2">From farm to your door in three simple steps</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Leaf, step: "01", title: "Farmers List Products", desc: "Verified Filipino farmers upload fresh produce with real-time stock and pricing. Direct from the source." },
              { icon: Package, step: "02", title: "You Order Online", desc: "Browse the marketplace, add to cart, and place your order. Multiple payment options available." },
              { icon: Truck, step: "03", title: "Logistics Delivers", desc: "Our network of logistics partners picks up from the farm and delivers fresh to your door." },
            ].map((step) => (
              <div key={step.step} className="text-center group">
                <div className="relative inline-flex items-center justify-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <step.icon className="w-8 h-8 text-primary" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center">
                    {step.step}
                  </span>
                </div>
                <h3 className="mt-4 font-bold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-10 bg-muted/30 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Shield, title: "Verified Farmers", desc: "Every seller is verified and rated" },
              { icon: Truck, title: "Nationwide Delivery", desc: "Delivering across all regions" },
              { icon: Star, title: "Quality Guaranteed", desc: "Fresh or we make it right" },
              { icon: Users, title: "Community First", desc: "Supporting Filipino agriculture" },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-foreground">What Our Community Says</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-card border border-card-border rounded-xl p-6">
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed italic">"{t.quote}"</p>
                <div className="flex items-center gap-3 mt-4">
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 bg-primary">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-extrabold text-primary-foreground">Ready to experience farm-fresh produce?</h2>
          <p className="mt-3 text-primary-foreground/80 text-lg">Join thousands of Filipinos who buy fresh, buy local, buy fair.</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/marketplace">
              <Button size="lg" variant="secondary" className="font-semibold" data-testid="button-cta-shop">
                Shop the Marketplace
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 font-semibold" data-testid="button-cta-sell">
                Become a Seller
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
