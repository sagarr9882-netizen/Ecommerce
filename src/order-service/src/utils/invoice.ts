import PDFDocument from "pdfkit";

interface InvoiceData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  items: { name: string; price: number; quantity: number }[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  createdAt: Date;
}

export const generateInvoice = (data: InvoiceData): Promise<Buffer> => {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).text("INVOICE", { align: "center" });
    doc.moveDown();

    doc.fontSize(10).text(`Order #: ${data.orderId}`);
    doc.text(`Customer: ${data.customerName}`);
    doc.text(`Email: ${data.customerEmail}`);
    doc.text(`Date: ${data.createdAt.toLocaleDateString()}`);
    doc.moveDown();

    doc.fontSize(12).text("Items", { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(10);
    data.items.forEach((item) => {
      doc.text(
        `${item.name} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}`
      );
    });

    doc.moveDown();
    doc.text(`Subtotal: $${data.subtotal.toFixed(2)}`);
    doc.text(`Shipping: $${data.shipping.toFixed(2)}`);
    if (data.discount > 0) {
      doc.text(`Discount: -$${data.discount.toFixed(2)}`);
    }
    doc.fontSize(14).text(`Total: $${data.total.toFixed(2)}`);

    doc.end();
  });
};
