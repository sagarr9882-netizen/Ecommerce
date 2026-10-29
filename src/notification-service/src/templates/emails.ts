export const orderCreatedTemplate = (data: {
  orderId: string;
  total: number;
  items: { name: string; quantity: number }[];
}) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #4f46e5; padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Order Confirmed!</h1>
  </div>
  <div style="padding: 20px; border: 1px solid #e5e7eb;">
    <p>Your order <strong>#${data.orderId}</strong> has been received.</p>
    <h3>Items:</h3>
    <ul>
      ${data.items
        .map(
          (item) => `<li>${item.name} x${item.quantity}</li>`
        )
        .join("")}
    </ul>
    <p style="font-size: 18px; font-weight: bold;">
      Total: $${data.total.toFixed(2)}
    </p>
    <p>We'll notify you when your order ships!</p>
  </div>
</body>
</html>
`;

export const paymentConfirmedTemplate = (data: {
  orderId: string;
}) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #059669; padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Payment Confirmed</h1>
  </div>
  <div style="padding: 20px; border: 1px solid #e5e7eb;">
    <p>Payment for order <strong>#${data.orderId}</strong> has been confirmed.</p>
    <p>Your order is now being processed.</p>
  </div>
</body>
</html>
`;

export const orderShippedTemplate = (data: {
  orderId: string;
  trackingNumber: string;
  estimatedDelivery: string;
}) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #2563eb; padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Your Order Has Shipped!</h1>
  </div>
  <div style="padding: 20px; border: 1px solid #e5e7eb;">
    <p>Order <strong>#${data.orderId}</strong> is on its way!</p>
    <p><strong>Tracking Number:</strong> ${data.trackingNumber}</p>
    <p><strong>Estimated Delivery:</strong> ${new Date(
      data.estimatedDelivery
    ).toLocaleDateString()}</p>
  </div>
</body>
</html>
`;

export const orderDeliveredTemplate = (data: {
  orderId: string;
}) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #7c3aed; padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">Order Delivered!</h1>
  </div>
  <div style="padding: 20px; border: 1px solid #e5e7eb;">
    <p>Order <strong>#${data.orderId}</strong> has been delivered.</p>
    <p>We hope you enjoy your purchase! Leave a review and help other customers.</p>
  </div>
</body>
</html>
`;
