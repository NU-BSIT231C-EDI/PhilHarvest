import { useState, useMemo } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import PublicLayout from "@/layouts/PublicLayout";
import ProductCard from "@/components/shared/ProductCard";
import EmptyState from "@/components/shared/EmptyState";
import { products, categories } from "@/data/mockData";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";

const regions = ["All Regions", "CAR (Benguet)", "Region I (Ilocos)", "Region IV-A (Batangas)", "Region VII (Cebu)", "Region XI (Davao)"];

export default function Marketplace() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("featured");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("All Regions");
  const { addToCart } = useCart();
  const { toast } = useToast();

  const minVal = priceMin !== "" ? Number(priceMin) : null;
  const maxVal = priceMax !== "" ? Number(priceMax) : null;

  const filtered = useMemo(() => {
    let list = [...products];
    if (search) list = list.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase()));
    if (selectedCategory !== "all") list = list.filter((p) => p.category === selectedCategory);
    if (selectedRegion !== "All Regions") list = list.filter((p) => p.sellerRegion.toLowerCase().includes(selectedRegion.split("(")[1]?.replace(")", "").toLowerCase() || ""));
    if (minVal !== null) list = list.filter((p) => p.price >= minVal);
    if (maxVal !== null) list = list.filter((p) => p.price <= maxVal);
    if (sortBy === "price_asc") list.sort((a, b) => a.price - b.price);
    else if (sortBy === "price_desc") list.sort((a, b) => b.price - a.price);
    else if (sortBy === "rating") list.sort((a, b) => b.rating - a.rating);
    else if (sortBy === "featured") list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    return list;
  }, [search, selectedCategory, sortBy, minVal, maxVal, selectedRegion]);

  const priceFilterLabel =
    minVal !== null && maxVal !== null
      ? `₱${minVal}–₱${maxVal}`
      : minVal !== null
      ? `Min ₱${minVal}`
      : maxVal !== null
      ? `Max ₱${maxVal}`
      : null;

  const activeFilters = [
    selectedCategory !== "all" && categories.find((c) => c.id === selectedCategory)?.name,
    selectedRegion !== "All Regions" && selectedRegion,
    priceFilterLabel,
  ].filter(Boolean) as string[];

  function handleAddToCart(product: Parameters<typeof addToCart>[0]) {
    addToCart(product);
    toast({ title: "Added to cart", description: `${product.name} added to your cart.` });
  }

  const FilterContent = () => (
    <div className="space-y-6">
      <div>
        <h4 className="font-semibold text-sm mb-3">Category</h4>
        <div className="space-y-2">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`w-full flex items-center justify-between text-sm px-3 py-2 rounded-lg transition-colors ${selectedCategory === "all" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            <span>All Products</span>
            <Badge variant="secondary" className="text-xs">{products.length}</Badge>
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`w-full flex items-center justify-between text-sm px-3 py-2 rounded-lg transition-colors ${selectedCategory === cat.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              <span>{cat.name}</span>
              <Badge variant="secondary" className="text-xs">{cat.productCount}</Badge>
            </button>
          ))}
        </div>
      </div>
      <div>
        <h4 className="font-semibold text-sm mb-3">Price Range (₱)</h4>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Min</label>
            <Input
              type="number"
              placeholder="0"
              value={priceMin}
              min={0}
              onChange={(e) => setPriceMin(e.target.value)}
              className="h-8 text-sm"
              data-testid="input-price-min"
            />
          </div>
          <span className="text-muted-foreground mt-5">–</span>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Max</label>
            <Input
              type="number"
              placeholder="Any"
              value={priceMax}
              min={0}
              onChange={(e) => setPriceMax(e.target.value)}
              className="h-8 text-sm"
              data-testid="input-price-max"
            />
          </div>
        </div>
        {(priceMin !== "" || priceMax !== "") && (
          <button
            className="text-xs text-primary hover:underline mt-1"
            onClick={() => { setPriceMin(""); setPriceMax(""); }}
          >
            Clear price
          </button>
        )}
      </div>
      <div>
        <h4 className="font-semibold text-sm mb-3">Region</h4>
        <div className="space-y-2">
          {regions.map((r) => (
            <div key={r} className="flex items-center gap-2">
              <Checkbox id={r} checked={selectedRegion === r} onCheckedChange={() => setSelectedRegion(r)} />
              <Label htmlFor={r} className="text-sm cursor-pointer">{r}</Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Fresh Marketplace</h1>
          <p className="text-muted-foreground text-sm mt-1">Direct from Filipino farms — {products.length} products available</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search products, farmers, regions..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-48" data-testid="select-sort">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="featured">Featured</SelectItem>
              <SelectItem value="price_asc">Price: Low to High</SelectItem>
              <SelectItem value="price_desc">Price: High to Low</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
            </SelectContent>
          </Select>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="lg:hidden gap-2" data-testid="button-filter-mobile">
                <SlidersHorizontal className="w-4 h-4" /> Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <FilterContent />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {activeFilters.map((f) => (
              <Badge key={f} variant="secondary" className="gap-1 cursor-pointer" onClick={() => {
                if (categories.find((c) => c.name === f)) setSelectedCategory("all");
                else if (f === selectedRegion) setSelectedRegion("All Regions");
                else { setPriceMin(""); setPriceMax(""); }
              }}>
                {f} <X className="w-3 h-3" />
              </Badge>
            ))}
            <button className="text-xs text-primary hover:underline" onClick={() => { setSelectedCategory("all"); setSelectedRegion("All Regions"); setPriceMin(""); setPriceMax(""); }}>Clear all</button>
          </div>
        )}

        <div className="flex gap-6">
          <aside className="hidden lg:block w-56 xl:w-64 shrink-0">
            <div className="bg-card border border-card-border rounded-xl p-5 sticky top-20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Filters</h3>
                <button className="text-xs text-primary hover:underline" onClick={() => { setSelectedCategory("all"); setSelectedRegion("All Regions"); setPriceMin(""); setPriceMax(""); }}>Clear</button>
              </div>
              <FilterContent />
            </div>
          </aside>

          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-4">{filtered.length} products found</p>
            {filtered.length === 0 ? (
              <EmptyState icon={ShoppingBag} title="No products found" description="Try adjusting your search or filters." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {filtered.map((p) => (
                  <ProductCard key={p.id} product={p} onAddToCart={handleAddToCart} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
