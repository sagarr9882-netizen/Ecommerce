"use client";

import Link from "next/link";
import { Product } from "@/types";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();

  const hasDiscount = product.comparePrice && product.comparePrice > product.price;

  return (
    <Card className="overflow-hidden group">
      <Link href={`/products/${product.id}`}>
        <div className="aspect-square relative overflow-hidden bg-muted">
          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="object-cover w-full h-full group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No image
            </div>
          )}
          {hasDiscount && (
            <Badge className="absolute top-2 left-2" variant="destructive">
              -{Math.round(((product.comparePrice! - product.price) / product.comparePrice!) * 100)}%
            </Badge>
          )}
          {product.featured && (
            <Badge className="absolute top-2 right-2" variant="success">
              Featured
            </Badge>
          )}
        </div>
      </Link>

      <CardContent className="p-4">
        <Link href={`/products/${product.id}`}>
          <h3 className="font-semibold truncate">{product.name}</h3>
        </Link>
        <p className="text-sm text-muted-foreground truncate mt-1">
          {product.category?.name}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-lg font-bold">{formatPrice(product.price)}</span>
          {hasDiscount && (
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(product.comparePrice!)}
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button
          className="w-full"
          onClick={() =>
            addItem({
              productId: product.id,
              name: product.name,
              price: product.price,
              quantity: 1,
              image: product.images?.[0] || "",
              stock: product.stock,
            })
          }
          disabled={product.stock === 0}
        >
          {product.stock === 0 ? "Out of Stock" : "Add to Cart"}
        </Button>
      </CardFooter>
    </Card>
  );
}
