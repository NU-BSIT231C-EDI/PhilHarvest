import { useState } from "react";
import { Search, Eye, CheckCircle, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import DashboardLayout from "@/layouts/DashboardLayout";
import StatusBadge from "@/components/shared/StatusBadge";
import { products, categories } from "@/data/mockData";
import type { Product } from "@/types";

export default function AdminProducts() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [productList, setProductList] = useState<Product[]>(products);

  const filtered = productList.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sellerName.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || p.category === categoryFilter;
    return matchSearch && matchCat;
  });

  function toggleStatus(id: string) {
    setProductList((prev) => prev.map((p) => p.id === id ? { ...p, status: p.status === "active" ? "inactive" as const : "active" as const } : p));
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
        </div>

        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {["Product", "Seller", "Category", "Price", "Stock", "Rating", "Status", "Actions"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors" data-testid={`row-product-${p.id}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <img src={p.images[0]} alt={p.name} className="w-9 h-9 rounded-lg object-cover shrink-0" />
                        <p className="font-semibold text-foreground">{p.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{p.sellerName}</td>
                    <td className="px-4 py-3"><Badge variant="secondary" className="text-xs capitalize">{p.category.replace("-", " ")}</Badge></td>
                    <td className="px-4 py-3 font-bold text-primary">₱{p.price}/{p.unit}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.stock}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="text-xs">★</span>
                        <span className="text-xs font-medium">{p.rating}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link href={`/marketplace/${p.id}`}><Button size="icon" variant="ghost" className="w-7 h-7" data-testid={`button-view-${p.id}`}><Eye className="w-3.5 h-3.5" /></Button></Link>
                        <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => toggleStatus(p.id)} data-testid={`button-toggle-${p.id}`}>
                          {p.status === "active" ? <XCircle className="w-3.5 h-3.5 text-destructive" /> : <CheckCircle className="w-3.5 h-3.5 text-secondary" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
