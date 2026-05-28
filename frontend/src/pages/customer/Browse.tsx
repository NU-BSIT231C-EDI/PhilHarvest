import { useState, useEffect, useMemo } from "react";
import { Search, ShoppingCart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/layouts/DashboardLayout";
import { categories } from "@/data/mockData";
import { Link } from "wouter";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { fetchProducts, type ApiProduct } from "@/services/productsApi";

function productToCartItem(p: ApiProduct) {
  return {
    id: String(p.id),
    name: p.name,
    category: p.category ?? "",
    description: p.description ?? "",
    price: Number(p.unit_price),
    unit: p.unit_of_measure,
    stock: p.stock_quantity,
    sellerId: "",
    sellerName: p.seller_name ?? "",
    sellerRegion: "",
    images: p.image_url ? [p.image_url] : ["https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400&q=80"],
    rating: 0,
    reviewCount: 0,
    status: (p.is_active ? "active" : "inactive") as "active" | "inactive",
    featured: false,
    createdAt: p.created_at,
  };
}

export default function CustomerBrowse() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("featured");
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart, cartCount } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    fetchProducts({ active: true, per_page: 100 })
      .then((page) => setProducts(page.data))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = [...products];
    if (search) list = list.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
    if (category !== "all") list = list.filter((p) => p.category === category);
    if (sort === "price_asc") list.sort((a, b) => Number(a.unit_price) - Number(b.unit_price));
    else if (sort === "price_desc") list.sort((a, b) => Number(b.unit_price) - Number(a.unit_price));
    return list;
  }, [products, search, category, sort]);

  function handleAddToCart(p: ApiProduct) {
    addToCart(productToCartItem(p));
    toast({ title: "Added to cart", description: `${p.name} added to your cart.` });
  }

  return (
    <DashboardLayout role="customer" title="Browse Products">
      <div className="p-6 space-y-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search fresh produce..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-search" />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-44" data-testid="select-category">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-full sm:w-44" data-testid="select-sort">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="featured">Default</SelectItem>
              <SelectItem value="price_asc">Price: Low to High</SelectItem>
              <SelectItem value="price_desc">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
          <Link href="/customer/cart">
            <Button variant="outline" className="gap-2 shrink-0" data-testid="button-go-to-cart">
              <ShoppingCart className="w-4 h-4" /> Cart ({cartCount})
            </Button>
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading products...</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{filtered.length} products found</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((p) => (
                <div key={p.id} className="bg-card border border-card-border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                  <img
                    src={p.image_url || "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400&q=80"}
                    alt={p.name}
                    className="w-full h-40 object-cover"
                  />
                  <div className="p-4 space-y-2">
                    <p className="font-semibold text-foreground text-sm">{p.name}</p>
                    {p.seller_name && <p className="text-xs text-muted-foreground">{p.seller_name}</p>}
                    <p className="font-bold text-primary">₱{Number(p.unit_price).toFixed(2)}/{p.unit_of_measure}</p>
                    <p className="text-xs text-muted-foreground">{p.stock_quantity} {p.unit_of_measure} available</p>
                    <Button
                      size="sm"
                      className="w-full gap-2 mt-1"
                      disabled={p.stock_quantity === 0}
                      onClick={() => handleAddToCart(p)}
                      data-testid={`button-add-to-cart-${p.id}`}
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />Add to Cart
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
