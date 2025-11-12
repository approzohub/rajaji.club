import { Schema, model, Types, Document } from 'mongoose';

export interface IWallet extends Document {
  user: Types.ObjectId;
  main: number;
  bonus: number;
  createdAt: Date;
  updatedAt: Date;
}

const walletSchema = new Schema<IWallet>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  main: { type: Number, default: 0 },
  bonus: { type: Number, default: 0 },
}, { timestamps: true });

export const Wallet = model<IWallet>('Wallet', walletSchema); 