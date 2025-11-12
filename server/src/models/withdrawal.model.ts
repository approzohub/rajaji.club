import { Schema, model, Types, Document } from 'mongoose';

export interface IWithdrawal extends Document {
  user: Types.ObjectId;
  amount: number;
  walletType: 'main'; // Only main wallet withdrawals allowed
  status: 'pending' | 'rejected' | 'completed';
  note?: string;
  paymentMethod?: Types.ObjectId;
  processedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const withdrawalSchema = new Schema<IWithdrawal>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  walletType: { type: String, enum: ['main'], required: true }, // Only main wallet withdrawals allowed
  status: { type: String, enum: ['pending', 'rejected', 'completed'], default: 'pending' },
  note: { type: String },
  paymentMethod: { type: Schema.Types.ObjectId, ref: 'Payment' },
  processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export const Withdrawal = model<IWithdrawal>('Withdrawal', withdrawalSchema); 