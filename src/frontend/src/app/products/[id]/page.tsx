"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { productApi } from "@/lib/api";
import { Product as ProductType } from "@/types";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductType | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const { addItem } = useCart();
  const { user } = useAuth();

  useEffect(() => {
    productApi
      .get(`/products/${id}`)
      .then(({ data }) => {
        setProduct(data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddReview = async () => {
    if (!comment) return;
    try {
      await productApi.post(`/products/${id}/reviews`, { rating, comment });
      setComment("");
      const { data } = await productApi.get(`/products/${id}`);
      setProduct(data);
    } catch {}
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="h-96 bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!product) {
    return <div className="container mx-auto px-4 py-8">Product not found</div>;
  }

  const hasDiscount = product.comparePrice && product.comparePrice > product.price;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-4">
            {product.images?.[selectedImage] ? (
              <img
                src={product.images[selectedImage]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No image
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`w-20 h-20 rounded border-2 overflow-hidden ${
                    idx === selectedImage ? "border-primary" : "border-transparent"
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
          <p className="text-muted-foreground mb-4">{product.category?.name}</p>

          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl font-bold">{formatPrice(product.price)}</span>
            {hasDiscount && (
              <>
                <span className="text-lg text-muted-foreground line-through">
                  {formatPrice(product.comparePrice!)}
                </span>
                <Badge variant="destructive">
                  -{Math.round(((product.comparePrice! - product.price) / product.comparePrice!) * 100)}%
                </Badge>
              </>
            )}
          </div>

          <p className="text-muted-foreground mb-6">{product.description}</p>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center border rounded-md">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                -
              </Button>
              <span className="px-4">{quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
              >
                +
              </Button>
            </div>
            <Button
              size="lg"
              className="flex-1"
              disabled={product.stock === 0}
              onClick={() =>
                addItem({
                  productId: product.id,
                  name: product.name,
                  price: product.price,
                  quantity,
                  image: product.images?.[0] || "",
                  stock: product.stock,
                })
              }
            >
              {product.stock === 0 ? "Out of Stock" : "Add to Cart"}
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
          </div>
        </div>
      </div>

      <section className="mt-12">
        <h2 className="text-2xl font-bold mb-6">Reviews</h2>

        {user && (
          <div className="mb-8 p-4 border rounded-lg">
            <h3 className="font-semibold mb-4">Write a Review</h3>
            <div className="flex gap-1 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`text-2xl ${star <= rating ? "text-yellow-400" : "text-gray-300"}`}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              className="w-full border rounded-md p-3 mb-4 bg-background"
              rows={3}
              placeholder="Write your review..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <Button onClick={handleAddReview} disabled={!comment}>
              Submit Review
            </Button>
          </div>
        )}

        <div className="space-y-4">
          {product.reviews?.map((review) => (
            <div key={review._id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{review.userName}</span>
                <div className="flex text-yellow-400">
                  {Array.from({ length: review.rating }).map((_, i) => (
                    <span key={i}>★</span>
                  ))}
                </div>
              </div>
              <p className="text-muted-foreground">{review.comment}</p>
            </div>
          ))}
          {(!product.reviews || product.reviews.length === 0) && (
            <p className="text-muted-foreground">No reviews yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
