import { useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, Upload, ArrowLeft, X, ImageIcon } from "lucide-react";
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
import { useSellerProducts } from "@/contexts/SellerProductsContext";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  category: z.string().min(1, "Please select a category"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  price: z.coerce.number().positive("Price must be greater than 0"),
  unit: z.string().min(1, "Please select a unit"),
  stock: z.coerce.number().int().nonnegative("Stock cannot be negative"),
  active: z.boolean(),
});

type ProductFormData = z.infer<typeof schema>;

export default function ProductForm() {
  const [, editParams] = useRoute("/seller/products/:id/edit");
  const [, navigate] = useLocation();
  const isEdit = !!editParams?.id;
  const { sellerProducts, addProduct, updateProduct } = useSellerProducts();
  const { toast } = useToast();
  const existing = isEdit ? sellerProducts.find((p) => p.id === editParams.id) : undefined;

  const [imagePreviews, setImagePreviews] = useState<string[]>(existing?.images ?? []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: existing?.name ?? "",
      category: existing?.category ?? "",
      description: existing?.description ?? "",
      price: existing?.price ?? 0,
      unit: existing?.unit ?? "kg",
      stock: existing?.stock ?? 0,
      active: existing?.status === "active" || true,
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setImagePreviews((prev) => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  function removeImage(index: number) {
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  }

  function onSubmit(data: ProductFormData) {
    const images = imagePreviews.length > 0
      ? imagePreviews
      : ["https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400&q=80"];

    if (isEdit && editParams?.id) {
      updateProduct(editParams.id, {
        ...data,
        images,
        status: data.active ? "active" : "inactive",
        featured: false,
      });
      toast({ title: "Product updated", description: `${data.name} has been updated successfully.` });
    } else {
      addProduct({
        name: data.name,
        category: data.category,
        description: data.description,
        price: data.price,
        unit: data.unit,
        stock: data.stock,
        images,
        status: data.active ? "active" : "inactive",
        featured: false,
      });
      toast({ title: "Product added", description: `${data.name} has been added to your products.` });
    }
    navigate("/seller/products");
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
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Name</FormLabel>
                        <FormControl><Input placeholder="e.g. Benguet Tomatoes" {...field} data-testid="input-product-name" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
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
                  <CardHeader><CardTitle className="text-base">Product Images</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {imagePreviews.length > 0 && (
                      <div className="grid grid-cols-3 gap-3">
                        {imagePreviews.map((src, i) => (
                          <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-border">
                            <img src={src} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeImage(i)}
                              className="absolute top-1 right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              data-testid={`button-remove-image-${i}`}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      multiple
                      className="hidden"
                      onChange={handleFileChange}
                      data-testid="input-file-upload"
                    />
                    <div
                      className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="area-image-upload"
                    >
                      {imagePreviews.length === 0
                        ? <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        : <ImageIcon className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                      }
                      <p className="text-sm font-medium text-foreground">
                        {imagePreviews.length === 0 ? "Click to upload images" : "Add more images"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP up to 5MB each</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        type="button"
                        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                      >
                        Browse Files
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-5">
                <Card className="border-card-border">
                  <CardHeader><CardTitle className="text-base">Pricing & Inventory</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={form.control} name="price" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price (₱)</FormLabel>
                          <FormControl><Input type="number" min={0} {...field} data-testid="input-price" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="unit" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger data-testid="select-unit"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              {["kg", "bundle", "piece", "sack", "box", "seedling", "sapling", "10kg bag", "25kg sack"].map((u) => (
                                <SelectItem key={u} value={u}>{u}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="stock" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Available Stock</FormLabel>
                        <FormControl><Input type="number" min={0} {...field} data-testid="input-stock" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </CardContent>
                </Card>

                <Card className="border-card-border">
                  <CardContent className="p-5">
                    <FormField control={form.control} name="active" render={({ field }) => (
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

                <Button type="submit" className="w-full gap-2" data-testid="button-save-product">
                  <Save className="w-4 h-4" />{isEdit ? "Update Product" : "Add Product"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}
