import { Link } from "wouter";
import { ShoppingCart, Heart, Star, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
  onWishlist?: (product: Product) => void;
  inWishlist?: boolean;
}

export default function ProductCard({ product, onAddToCart, onWishlist, inWishlist }: ProductCardProps) {
  return (
    <div
      className="group bg-card border border-card-border rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
      data-testid={`card-product-${product.id}`}
    >
      {/* Image */}
      <Link href={`/marketplace/${product.id}`} className="block relative overflow-hidden aspect-[4/3]">
        <img
          src={product.images[0] || "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400&q=80"}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {product.featured && (
          <Badge className="absolute top-2 left-2 bg-accent text-accent-foreground text-xs font-semibold">
            Featured
          </Badge>
        )}
        <button
          onClick={(e) => { e.preventDefault(); onWishlist?.(product); }}
          className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            inWishlist
              ? "bg-destructive text-destructive-foreground"
              : "bg-white/90 text-foreground/60 hover:text-destructive"
          }`}
          data-testid={`button-wishlist-${product.id}`}
        >
          <Heart className="w-4 h-4" fill={inWishlist ? "currentColor" : "none"} />
        </button>
      </Link>

      {/* Content */}
      <div className="p-4">
        <Link href={`/marketplace/${product.id}`}>
          <h3 className="font-semibold text-foreground hover:text-primary transition-colors leading-snug line-clamp-1">
            {product.name}
          </h3>
        </Link>

        <div className="flex items-center gap-1 mt-1">
          <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground line-clamp-1">{product.sellerRegion}</span>
        </div>

        <div className="flex items-center gap-1 mt-1">
          <Star className="w-3.5 h-3.5 fill-accent text-accent" />
          <span className="text-sm font-medium">{product.rating}</span>
          <span className="text-xs text-muted-foreground">({product.reviewCount})</span>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div>
            <span className="text-lg font-bold text-primary">₱{product.price.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground ml-1">/{product.unit}</span>
          </div>
          <Button
            size="sm"
            onClick={() => onAddToCart?.(product)}
            className="gap-1.5"
            data-testid={`button-add-to-cart-${product.id}`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
