import { useState, useEffect } from "react";
import { AlertTriangle, Save, PackagePlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/layouts/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { fetchProducts, updateProduct, type ApiProduct } from "@/services/productsApi";
import { send846 } from "@/services/ediApi";

export default function Inventory() {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [stocks, setStocks] = useState<Record<number, number>>({});
  const [addQty, setAddQty] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [adding, setAdding] = useState<Record<number, boolean>>({});
  const { toast } = useToast();

  async function load() {
    setLoading(true);
    try {
      const page = await fetchProducts();
      setProducts(page.data);
      setStocks(Object.fromEntries(page.data.map((p) => [p.id, p.stock_quantity])));
      setAddQty(Object.fromEntries(page.data.map((p) => [p.id, 0])));
    } catch (e) {
      toast({ title: "Error loading inventory", description: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function saveStock(p: ApiProduct) {
    setSaving((prev) => ({ ...prev, [p.id]: true }));
    try {
      await updateProduct(p.id, { stock_quantity: stocks[p.id] });
      toast({ title: "Stock updated", description: `${p.name} set to ${stocks[p.id]} ${p.unit_of_measure}.` });
    } catch (e) {
      toast({ title: "Update failed", description: String(e), variant: "destructive" });
    } finally {
      setSaving((prev) => ({ ...prev, [p.id]: false }));
    }
  }

  async function addStocks(p: ApiProduct) {
    const delta = addQty[p.id] ?? 0;
    if (delta <= 0) {
      toast({ title: "Invalid quantity", description: "Enter a number greater than 0.", variant: "destructive" });
      return;
    }
    setAdding((prev) => ({ ...prev, [p.id]: true }));
    const newQty = (stocks[p.id] ?? p.stock_quantity) + delta;
    try {
      await updateProduct(p.id, { stock_quantity: newQty });
      const updatedStocks = { ...stocks, [p.id]: newQty };
      setStocks(updatedStocks);
      setAddQty((prev) => ({ ...prev, [p.id]: 0 }));

      // Send EDI 846 with full inventory snapshot (all products)
      const today = new Date().toISOString().slice(0, 10);
      await send846({
        reference_number: `INVEN-${today}`,
        items: products.map((prod) => ({
          sku:      prod.sku,
          quantity: updatedStocks[prod.id] ?? prod.stock_quantity,
          uom:      prod.unit_of_measure ?? 'EA',
        })),
      });

      toast({
        title: "Stocks added",
        description: `${p.name} updated to ${newQty} ${p.unit_of_measure}. EDI 846 sent to SERMACROPS.`,
      });
    } catch (e) {
      toast({ title: "Add stocks failed", description: String(e), variant: "destructive" });
    } finally {
      setAdding((prev) => ({ ...prev, [p.id]: false }));
    }
  }

  const lowStockProducts = products.filter((p) => (stocks[p.id] ?? p.stock_quantity) <= p.reorder_point);

  return (
    <DashboardLayout role="seller" title="Inventory Management">
      <div className="p-6 space-y-5">
        {!loading && lowStockProducts.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Low Stock Alert</p>
              <p className="text-xs text-amber-700 mt-0.5">
                {lowStockProducts.map((p) => p.name).join(", ")} — stock is at or below reorder point.
              </p>
            </div>
          </div>
        )}

        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground text-sm">Loading inventory...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground text-sm">No products found. Add products in My Products first.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Product</th>
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Category</th>
                    <th className="text-right px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Current Stock</th>
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Stock Level</th>
                    <th className="text-right px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Set Stock</th>
                    <th className="text-right px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Add Stocks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products.map((p) => {
                    const stock = stocks[p.id] ?? p.stock_quantity;
                    const level = stock > p.reorder_point * 3 ? "high" : stock > p.reorder_point ? "medium" : "low";
                    return (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors" data-testid={`row-inventory-${p.id}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={p.image_url || "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=100&q=80"}
                              alt={p.name}
                              className="w-9 h-9 rounded-lg object-cover"
                            />
                            <div>
                              <p className="font-semibold">{p.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{p.sku}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 capitalize text-muted-foreground">
                          {p.category ? p.category.replace("-", " ") : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-bold">{stock} {p.unit_of_measure}</td>
                        <td className="px-4 py-3">
                          <Badge className={level === "high" ? "bg-green-100 text-green-800 border-green-200" : level === "medium" ? "bg-yellow-100 text-yellow-800 border-yellow-200" : "bg-red-100 text-red-800 border-red-200"}>
                            {level === "high" ? "In Stock" : level === "medium" ? "Medium" : "Low Stock"}
                          </Badge>
                        </td>

                        {/* Set absolute stock */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 justify-end">
                            <Input
                              type="number"
                              className="w-24 h-8 text-sm"
                              value={stock}
                              min={0}
                              onChange={(e) => setStocks((prev) => ({ ...prev, [p.id]: parseInt(e.target.value) || 0 }))}
                              data-testid={`input-stock-${p.id}`}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 h-8"
                              disabled={saving[p.id]}
                              onClick={() => saveStock(p)}
                              data-testid={`button-save-stock-${p.id}`}
                            >
                              <Save className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>

                        {/* Add stocks delta — saves + sends 846 */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 justify-end">
                            <Input
                              type="number"
                              className="w-24 h-8 text-sm"
                              value={addQty[p.id] ?? 0}
                              min={0}
                              placeholder="+ qty"
                              onChange={(e) => setAddQty((prev) => ({ ...prev, [p.id]: parseInt(e.target.value) || 0 }))}
                              data-testid={`input-addqty-${p.id}`}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 h-8 border-cyan-300 text-cyan-700 hover:bg-cyan-50 whitespace-nowrap"
                              disabled={adding[p.id] || (addQty[p.id] ?? 0) <= 0}
                              onClick={() => addStocks(p)}
                              data-testid={`button-add-stocks-${p.id}`}
                            >
                              <PackagePlus className="w-3.5 h-3.5" />
                              Add Stocks
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
