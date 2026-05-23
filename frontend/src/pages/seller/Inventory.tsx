import { useState } from "react";
import { AlertTriangle, Archive, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/layouts/DashboardLayout";
import { useProductStore } from "@/store";

export default function Inventory() {
  const allProducts = useProductStore((s) => s.products);
  const myProducts = allProducts.filter((p) => p.sellerId === "s1");

  const [stocks, setStocks] = useState<Record<string, number>>(() =>
    Object.fromEntries(myProducts.map((p) => [p.id, p.stock]))
  );

  return (
    <DashboardLayout role="seller" title="Inventory Management">
      <div className="p-6 space-y-5">
        {/* Low stock alert */}
        {myProducts.some((p) => stocks[p.id] < 50) && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Low Stock Alert</p>
              <p className="text-xs text-amber-700 mt-0.5">
                {myProducts.filter((p) => stocks[p.id] < 50).map((p) => p.name).join(", ")} — stock is running low.
              </p>
            </div>
          </div>
        )}

        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Product</th>
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Category</th>
                  <th className="text-right px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Current Stock</th>
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Stock Level</th>
                  <th className="text-right px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {myProducts.map((p) => {
                  const stock = stocks[p.id];
                  const level = stock >= 200 ? "high" : stock >= 50 ? "medium" : "low";
                  return (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors" data-testid={`row-inventory-${p.id}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img src={p.images[0]} alt={p.name} className="w-9 h-9 rounded-lg object-cover" />
                          <p className="font-semibold">{p.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">{p.category.replace("-", " ")}</td>
                      <td className="px-4 py-3 text-right font-bold">{stock} {p.unit}s</td>
                      <td className="px-4 py-3">
                        <Badge className={level === "high" ? "bg-green-100 text-green-800 border-green-200" : level === "medium" ? "bg-yellow-100 text-yellow-800 border-yellow-200" : "bg-red-100 text-red-800 border-red-200"}>
                          {level === "high" ? "In Stock" : level === "medium" ? "Medium" : "Low Stock"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <Input type="number" className="w-24 h-8 text-sm" value={stock} onChange={(e) => setStocks((prev) => ({ ...prev, [p.id]: parseInt(e.target.value) || 0 }))} data-testid={`input-stock-${p.id}`} />
                          <Button size="sm" variant="outline" className="gap-1.5 h-8" data-testid={`button-save-stock-${p.id}`}><Save className="w-3.5 h-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
