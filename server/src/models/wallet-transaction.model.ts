import { Schema, model, Types, Document } from 'mongoose';

export interface IWalletTransaction extends Document {
  user: Types.ObjectId;
  initiator?: Types.ObjectId; // Made optional for system transactions
  initiatorRole: 'admin' | 'agent' | 'system';
  amount: number;
  walletType: 'main' | 'bonus';
  type: 'recharge' | 'debit' | 'refund' | 'bonus';
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const walletTransactionSchema = new Schema<IWalletTransaction>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  initiator: { type: Schema.Types.ObjectId, ref: 'User', required: false }, // Made optional
  initiatorRole: { type: String, enum: ['admin', 'agent', 'system'], required: true },
  amount: { type: Number, required: true },
  walletType: { type: String, enum: ['main', 'bonus'], required: true },
  type: { type: String, enum: ['recharge', 'debit', 'refund', 'bonus'], required: true },
  note: { type: String },
}, { timestamps: true });

// Add compound index to prevent duplicate transactions for same user and game within short time
walletTransactionSchema.index({ 
  user: 1, 
  note: 1, 
  createdAt: 1 
}, { 
  unique: false,
  expireAfterSeconds: 10 // Auto-delete after 10 seconds
});

export const WalletTransaction = model<IWalletTransaction>('WalletTransaction', walletTransactionSchema); 