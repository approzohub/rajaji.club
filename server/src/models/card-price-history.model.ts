import { Schema, model, Types, Document } from 'mongoose';
import { getCurrentISTTime } from '../utils/timezone';

export interface ICardPriceHistory extends Document {
  cardName: string;
  oldPrice: number;
  newPrice: number;
  changedBy: Types.ObjectId;  // Admin who changed the price
  reason?: string;
  effectiveFrom: Date;
  createdAt: Date;
}

const cardPriceHistorySchema = new Schema<ICardPriceHistory>({
  cardName: { type: String, required: true },
  oldPrice: { type: Number, required: true },
  newPrice: { type: Number, required: true },
  changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String },
  effectiveFrom: { type: Date, default: () => getCurrentISTTime() }
}, { timestamps: { createdAt: true, updatedAt: false } });

export const CardPriceHistory = model<ICardPriceHistory>('CardPriceHistory', cardPriceHistorySchema); 