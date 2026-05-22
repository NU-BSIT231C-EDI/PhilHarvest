import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, ArrowLeft, ImageIcon } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardLayout from "@/layouts/DashboardLayout";
import { categories } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";
import { fetchProducts, createProduct, updateProduct, type ApiProduct } from "@/services/productsApi";

const schema = z.object({
  sku: z.string().min(1, "SKU is required").max(100),
  name: z.string().min(3, "Name must be at least 3 characters"),
  category: z.string().optional(),
  description: z.string().optional(),
  unit_price: z.coerce.number().positive("Price must be greater than 0"),
  unit_of_measure: z.string().min(1, "Please select a unit"),
  stock_quantity: z.coerce.number().int().nonnegative("Stock cannot be negative"),
  reorder_point: z.coerce.number().int().nonnegative(),
  is_active: z.boolean(),
});

type ProductFormData = z.infer<typeof schema>;

export default function ProductForm() {
  const [, editParams] = useRoute("/seller/products/:id/edit");
  const [, navigate] = useLocation();
  const isEdit = !!editParams?.id;
  const { toast } = useToast();
  const [existing, setExisting] = useState<ApiProduct | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      sku: "",
      name: "",
      category: "",
      description: "",
      unit_price: 0,
      unit_of_measure: "EA",
      stock_quantity: 0,
      reorder_point: 0,
      is_active: true,
    },
  });

  useEffect(() => {
    if (!isEdit || !editParams?.id) return;
    fetchProducts({ per_page: 100 }).then((page) => {
      const found = page.data.find((p) => String(p.id) === editParams.id);
      if (found) {
        setExisting(found);
        setImagePreview(found.image_url ?? "");
        form.reset({
          sku: found.sku,
          name: found.name,
          category: found.category ?? "",
          description: found.description ?? "",
          unit_price: Number(found.unit_price),
          unit_of_measure: found.unit_of_measure,
          stock_quantity: found.stock_quantity,
          reorder_point: found.reorder_point,
          is_active: found.is_active,
        });
      }
    });
  }, [isEdit, editParams?.id]);

  async function onSubmit(data: ProductFormData) {
    setSubmitting(true);
    try {
      const payload = {
        ...data,
        image_url: imagePreview || undefined,
      };

      if (isEdit && existing) {
        await updateProduct(existing.id, payload);
        toast({ title: "Product updated", description: `${data.name} has been updated.` });
      } else {
        await createProduct(payload);
        toast({ title: "Product added", description: `${data.name} has been added.` });
      }
      navigate("/seller/products");
    } catch (e) {
      toast({ title: "Save failed", description: String(e), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout role="seller" title={isEdit ? "Edit Product" : "Add Product"}>
      <div className="p-6 space-y-5">
        <Link href="/seller/products">
          <Button variant="ghost" size="sm" className="gap-1 -ml-2">
            <ArrowLeft className="w-4 h-4" />Back to Products
          </Button>
        </Link>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 space-y-5">
                <Card className="border-card-border">
                  <CardHeader><CardTitle className="text-base">Product Information</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={form.control} name="sku" render={({ field }) => (
                        <FormItem>
                          <FormLabel>SKU</FormLabel>
                          <FormControl><Input placeholder="e.g. TOM-BNG-001" {...field} data-testid="input-sku" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product Name</FormLabel>
                          <FormControl><Input placeholder="e.g. Benguet Tomatoes" {...field} data-testid="input-product-name" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="category" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger data-testid="select-category"><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="description" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea rows={4} placeholder="Describe your product — freshness, growing method, best uses..." {...field} data-testid="textarea-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </CardContent>
                </Card>

                <Card className="border-card-border">
                  <CardHeader><CardTitle className="text-base">Product Image</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {imagePreview && (
                      <div className="w-32 h-32 rounded-xl overflow-hidden border border-border">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" onError={() => setImagePreview("")} />
                      </div>
                    )}
                    {!imagePreview && (
                      <div className="w-32 h-32 rounded-xl border border-dashed border-border flex items-center justify-center bg-muted/30">
                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-foreground">Image URL</label>
                      <Input
                        className="mt-1"
                        placeholder="https://example.com/image.jpg"
                        value={imagePreview}
                        onChange={(e) => setImagePreview(e.target.value)}
                        data-testid="input-image-url"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Paste a link to the product image</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-5">
                <Card className="border-card-border">
                  <CardHeader><CardTitle className="text-base">Pricing & Inventory</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={form.control} name="unit_price" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price (₱)</FormLabel>
                          <FormControl><Input type="number" step="0.01" min={0} {...field} data-testid="input-price" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="unit_of_measure" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit (UOM)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger data-testid="select-unit"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              {["EA", "KG", "LB", "CS", "BX", "BG", "DZ", "PC"].map((u) => (
                                <SelectItem key={u} value={u}>{u}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="stock_quantity" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Available Stock</FormLabel>
                        <FormControl><Input type="number" min={0} {...field} data-testid="input-stock" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="reorder_point" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reorder Point</FormLabel>
                        <FormControl><Input type="number" min={0} {...field} data-testid="input-reorder" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </CardContent>
                </Card>

                <Card className="border-card-border">
                  <CardContent className="p-5">
                    <FormField control={form.control} name="is_active" render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel className="text-sm font-semibold">Product Active</FormLabel>
                          <p className="text-xs text-muted-foreground">Visible to buyers in marketplace</p>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-active" />
                        </FormControl>
                      </FormItem>
                    )} />
                  </CardContent>
                </Card>

                <Button type="submit" className="w-full gap-2" disabled={submitting} data-testid="button-save-product">
                  <Save className="w-4 h-4" />{submitting ? "Saving..." : isEdit ? "Update Product" : "Add Product"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}
