"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { orderApi } from "@/lib/api";
import { Order } from "@/types";
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orderApi
      .get(`/orders/${id}`)
      .then(({ data }) => setOrder(data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return null;
  if (!order) return <div className="container mx-auto px-4 py-8">Order not found</div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Order Details</h1>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Order #{order.id.slice(0, 8)}</CardTitle>
            <Badge variant={order.status === "delivered" ? "success" : "default"}>
              {order.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Placed on {new Date(order.createdAt).toLocaleDateString()}
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">Items</h3>
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm py-1">
                <span>
                  {item.name} x{item.quantity}
                </span>
                <span>{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 space-y-1">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Shipping</span>
              <span>{order.shipping === 0 ? "Free" : formatPrice(order.shipping)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span>Discount</span>
                <span>-{formatPrice(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>

          {order.trackingNumber && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Tracking</h3>
              <p className="text-sm">Tracking Number: {order.trackingNumber}</p>
              {order.estimatedDelivery && (
                <p className="text-sm">
                  Estimated Delivery: {new Date(order.estimatedDelivery).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">Shipping Address</h3>
            {order.shippingAddress && (
              <div className="text-sm text-muted-foreground">
                <p>{(order.shippingAddress as any).street}</p>
                <p>
                  {(order.shippingAddress as any).city}, {(order.shippingAddress as any).state}{" "}
                  {(order.shippingAddress as any).zip}
                </p>
                <p>{(order.shippingAddress as any).country}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
