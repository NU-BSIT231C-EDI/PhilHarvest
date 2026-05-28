import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Search, Plus, Edit, Trash2, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/layouts/DashboardLayout";
import StatusBadge from "@/components/shared/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { fetchProducts, deleteProduct, type ApiProduct } from "@/services/productsApi";

export default function SellerProducts() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  async function load() {
    setLoading(true);
    try {
      const active = statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined;
      const page = await fetchProducts({ search, active });
      setProducts(page.data);
    } catch (e) {
      toast({ title: "Error loading products", description: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [search, statusFilter]);

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteProduct(id);
      toast({ title: "Product deleted", description: `${name} has been removed.` });
      load();
    } catch (e) {
      toast({ title: "Delete failed", description: String(e), variant: "destructive" });
    }
  }

  return (
    <DashboardLayout role="seller" title="Product Management">
      <div className="p-6 space-y-5">
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="flex gap-3 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-products"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36" data-testid="select-product-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="icon" onClick={load} title="Refresh" data-testid="button-refresh">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Link href="/seller/products/new">
              <Button className="gap-2" data-testid="button-add-product">
                <Plus className="w-4 h-4" />Add Product
              </Button>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="bg-card border border-card-border rounded-xl p-12 text-center">
            <p className="text-muted-foreground text-sm">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-card border border-card-border rounded-xl p-12 text-center">
            <p className="text-muted-foreground text-sm">No products found.</p>
            <Link href="/seller/products/new">
              <Button className="gap-2 mt-4" size="sm"><Plus className="w-4 h-4" />Add Your First Product</Button>
            </Link>
          </div>
        ) : (
          <div className="bg-card border border-card-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Product</th>
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">SKU</th>
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Category</th>
                    <th className="text-right px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Price</th>
                    <th className="text-right px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Stock</th>
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Status</th>
                    <th className="text-right px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors" data-testid={`row-product-${p.id}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.image_url || "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=100&q=80"}
                            alt={p.name}
                            className="w-10 h-10 rounded-lg object-cover shrink-0"
                          />
                          <p className="font-semibold text-foreground">{p.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{p.sku}</td>
                      <td className="px-4 py-3">
                        {p.category
                          ? <Badge variant="secondary" className="capitalize text-xs">{p.category.replace("-", " ")}</Badge>
                          : <span className="text-muted-foreground text-xs">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-primary">₱{Number(p.unit_price).toFixed(2)}/{p.unit_of_measure}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={p.stock_quantity <= p.reorder_point ? "text-destructive font-semibold" : "text-foreground"}>
                          {p.stock_quantity} {p.unit_of_measure}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.is_active ? "active" : "inactive"} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <Link href={`/seller/products/${p.id}/edit`}>
                            <Button size="icon" variant="ghost" className="w-8 h-8" data-testid={`button-edit-${p.id}`}>
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="w-8 h-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(p.id, p.name)}
                            data-testid={`button-delete-${p.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
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
