import { useState, useEffect } from "react";
import { Search, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/layouts/DashboardLayout";
import StatusBadge from "@/components/shared/StatusBadge";
import { categories } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";
import { fetchProducts, updateProduct, type ApiProduct } from "@/services/productsApi";

export default function AdminProducts() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  async function load() {
    setLoading(true);
    try {
      const page = await fetchProducts({ search, category: categoryFilter, per_page: 100 });
      setProducts(page.data);
    } catch (e) {
      toast({ title: "Error loading products", description: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [search, categoryFilter]);

  async function toggleStatus(p: ApiProduct) {
    try {
      const updated = await updateProduct(p.id, { is_active: !p.is_active });
      setProducts((prev) => prev.map((x) => x.id === updated.id ? updated : x));
    } catch (e) {
      toast({ title: "Update failed", description: String(e), variant: "destructive" });
    }
  }

  return (
    <DashboardLayout role="admin" title="Product Monitoring">
      <div className="p-6 space-y-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search products or sellers..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-search" />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-44" data-testid="select-category"><SelectValue placeholder="All Categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={load} title="Refresh" data-testid="button-refresh">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {loading ? (
          <div className="bg-card border border-card-border rounded-xl p-12 text-center">
            <p className="text-muted-foreground text-sm">Loading products...</p>
          </div>
        ) : (
          <div className="bg-card border border-card-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {["Product", "SKU", "Seller", "Category", "Price", "Stock", "Status", "Actions"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">No products found.</td>
                    </tr>
                  ) : products.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors" data-testid={`row-product-${p.id}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={p.image_url || "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=100&q=80"}
                            alt={p.name}
                            className="w-9 h-9 rounded-lg object-cover shrink-0"
                          />
                          <p className="font-semibold text-foreground">{p.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{p.sku}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{p.seller_name ?? "—"}</td>
                      <td className="px-4 py-3">
                        {p.category
                          ? <Badge variant="secondary" className="text-xs capitalize">{p.category.replace("-", " ")}</Badge>
                          : <span className="text-muted-foreground text-xs">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 font-bold text-primary">₱{Number(p.unit_price).toFixed(2)}/{p.unit_of_measure}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.stock_quantity}</td>
                      <td className="px-4 py-3"><StatusBadge status={p.is_active ? "active" : "inactive"} /></td>
                      <td className="px-4 py-3">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-7 h-7"
                          onClick={() => toggleStatus(p)}
                          title={p.is_active ? "Deactivate" : "Activate"}
                          data-testid={`button-toggle-${p.id}`}
                        >
                          {p.is_active
                            ? <XCircle className="w-3.5 h-3.5 text-destructive" />
                            : <CheckCircle className="w-3.5 h-3.5 text-secondary" />
                          }
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
