import { useState, useEffect, useRef } from "react";
import { usePolling } from "@/hooks/use-polling";
import { AlertTriangle, Save, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/layouts/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { fetchProducts, updateProduct, type ApiProduct } from "@/services/productsApi";
import { send846, fetchTradingPartners, type TradingPartner } from "@/services/ediApi";

export default function Inventory() {
  const [products, setProducts]   = useState<ApiProduct[]>([]);
  const [partners, setPartners]   = useState<TradingPartner[]>([]);
  const [loading, setLoading]     = useState(true);
  const [stocks, setStocks]       = useState<Record<number, number>>({});
  const [addQty, setAddQty]       = useState<Record<number, number>>({});
  const [saving, setSaving]       = useState<Record<number, boolean>>({});
  const [sending, setSending]     = useState(false);
  const { toast } = useToast();
  const addQtyRef = useRef(addQty);
  addQtyRef.current = addQty;

  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const [page, pts] = await Promise.all([fetchProducts(), fetchTradingPartners()]);
      setProducts(page.data);
      setPartners(pts);
      if (silent) {
        // Merge: only update stock for rows the user hasn't touched yet
        setStocks((prev) => {
          const next = { ...prev };
          for (const p of page.data) {
            if (!addQtyRef.current[p.id]) next[p.id] = p.stock_quantity;
          }
          return next;
        });
      } else {
        setStocks(Object.fromEntries(page.data.map((p) => [p.id, p.stock_quantity])));
        setAddQty(Object.fromEntries(page.data.map((p) => [p.id, 0])));
      }
    } catch (e) {
      if (!silent) toast({ title: "Error loading inventory", description: String(e), variant: "destructive" });
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  usePolling(() => load(true), 10_000);

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

  async function sendInventoryUpdate() {
    const updates = products.filter((p) => (addQty[p.id] ?? 0) > 0);
    if (updates.length === 0) return;

    setSending(true);
    try {
      // Save all delta updates first
      const updatedStocks = { ...stocks };
      await Promise.all(
        updates.map(async (p) => {
          const newQty = (stocks[p.id] ?? p.stock_quantity) + (addQty[p.id] ?? 0);
          await updateProduct(p.id, { stock_quantity: newQty });
          updatedStocks[p.id] = newQty;
        })
      );
      setStocks(updatedStocks);
      setAddQty(Object.fromEntries(products.map((p) => [p.id, 0])));

      // Build 846 — include all products except those excluded by the buyer partner
      const buyerPartner = partners.find((pt) => pt.edi_role === 'BY');
      const excludedSkus = new Set(
        (buyerPartner?.excluded_skus ?? []).map((s) => s.trim().toUpperCase())
      );

      const items = products
        .filter((p) => !excludedSkus.has(p.sku.trim().toUpperCase()))
        .map((p) => ({
          sku:      p.sku,
          quantity: updatedStocks[p.id] ?? p.stock_quantity,
          uom:      p.unit_of_measure ?? 'EA',
        }));

      const today = new Date().toISOString().slice(0, 10);
      await send846({ reference_number: `INVEN-${today}`, items });

      const skippedCount = products.length - items.length;
      toast({
        title: "Inventory update sent",
        description: `EDI 846 sent with ${items.length} item${items.length !== 1 ? 's' : ''}${skippedCount > 0 ? ` (${skippedCount} excluded per contract)` : ''}.`,
      });
    } catch (e) {
      toast({ title: "Send failed", description: String(e), variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  const lowStockProducts = products.filter((p) => (stocks[p.id] ?? p.stock_quantity) <= p.reorder_point);
  const hasDeltas = products.some((p) => (addQty[p.id] ?? 0) > 0);

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
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Product</th>
                      <th className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Category</th>
                      <th className="text-right px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Current Stock</th>
                      <th className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Stock Level</th>
                      <th className="text-right px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Set Stock</th>
                      <th className="text-right px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Add Qty</th>
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

                          {/* Delta qty — collected and sent together */}
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
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Centralized 846 send */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
                <p className="text-xs text-muted-foreground">
                  Enter quantities in the <span className="font-medium">Add Qty</span> column, then send a single inventory update (EDI 846) to your contracted trading partner.
                </p>
                <Button
                  size="sm"
                  className="gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white whitespace-nowrap"
                  disabled={!hasDeltas || sending}
                  onClick={sendInventoryUpdate}
                >
                  <Send className="w-3.5 h-3.5" />
                  {sending ? "Sending…" : "Send Stock Update (846)"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
