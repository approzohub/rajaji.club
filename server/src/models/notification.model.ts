import { Schema, model, Types, Document } from 'mongoose';

export interface INotification extends Document {
  type: 'withdrawal_request';
  title: string;
  message: string;
  userId: Types.ObjectId;
  userFullName: string;
  withdrawalId?: Types.ObjectId;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>({
  type: {
    type: String,
    enum: ['withdrawal_request'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userFullName: {
    type: String,
    required: true,
    trim: true
  },
  withdrawalId: {
    type: Schema.Types.ObjectId,
    ref: 'Withdrawal',
    required: false
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
notificationSchema.index({ isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

export const Notification = model<INotification>('Notification', notificationSchema); 