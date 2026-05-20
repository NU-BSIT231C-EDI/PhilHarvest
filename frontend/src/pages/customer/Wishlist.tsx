import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import DashboardLayout from "@/layouts/DashboardLayout";
import EmptyState from "@/components/shared/EmptyState";
import { useWishlist } from "@/contexts/WishlistContext";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { products } from "@/data/mockData";

export default function Wishlist() {
  const { wishlist, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { toast } = useToast();

  function handleAddToCart(productId: string, productName: string) {
    const product = products.find((p) => p.id === productId);
    if (product) {
      addToCart(product);
      toast({ title: "Added to cart", description: `${productName} added to your cart.` });
    }
  }

  function handleRemove(productId: string, productName: string) {
    removeFromWishlist(productId);
    toast({ title: "Removed from wishlist", description: `${productName} removed from your wishlist.` });
  }

  return (
    <DashboardLayout role="customer" title="Wishlist">
      <div className="p-6">
        {wishlist.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="Your wishlist is empty"
            description="Tap the heart icon on any product to save it here for later."
          />
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">{wishlist.length} saved item{wishlist.length !== 1 ? "s" : ""}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {wishlist.map((item) => (
                <Card key={item.productId} className="border-card-border overflow-hidden hover:shadow-md transition-shadow" data-testid={`card-wishlist-${item.productId}`}>
                  <div className="aspect-[4/3] overflow-hidden">
                    <img
                      src={item.image || "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400&q=80"}
                      alt={item.productName}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <CardContent className="p-4">
                    <p className="font-semibold text-foreground text-sm line-clamp-1">{item.productName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.sellerName}</p>
                    <p className="text-sm font-bold text-primary mt-1">
                      ₱{item.price.toLocaleString()}
                      <span className="text-muted-foreground font-normal text-xs ml-1">/{item.unit}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Saved on {item.addedAt}</p>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        className="flex-1 gap-1.5"
                        onClick={() => handleAddToCart(item.productId, item.productName)}
                        data-testid={`button-cart-${item.productId}`}
                      >
                        <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive border-destructive/30"
                        onClick={() => handleRemove(item.productId, item.productName)}
                        data-testid={`button-remove-wishlist-${item.productId}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
