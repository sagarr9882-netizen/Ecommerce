import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  type: string;
  email: string;
  subject: string;
  html: string;
  metadata: Record<string, any>;
  status: "sent" | "failed";
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    type: { type: String, required: true, index: true },
    email: { type: String, required: true },
    subject: { type: String, required: true },
    html: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ["sent", "failed"], default: "sent" },
  },
  { timestamps: true }
);

export const NotificationModel = mongoose.model<INotification>(
  "Notification",
  NotificationSchema
);
