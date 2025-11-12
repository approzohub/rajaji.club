import { Schema, model, Types, Document } from 'mongoose';
import { getCurrentISTTime } from '../utils/timezone';

export interface ICard extends Document {
  name: string;               // Unique identifier (e.g., "jack_of_clubs")
  card: string;               // Card value (J, Q, K, A, 10)
  symbol: string;             // Suit symbol (♣, ♠, ♥, ♦)
  suit: string;               // Suit name (clubs, spades, hearts, diamonds)
  basePrice: number;          // Base price
  currentPrice: number;       // Current market price
  isActive: boolean;          // Available for bidding
  totalBids: number;          // Total bids on this card
  totalAmount: number;        // Total amount bid on this card
  displayOrder: number;       // Order in which cards appear on game page
  lastPriceUpdate: Date;      // When price was last updated
  updatedBy?: Types.ObjectId; // Admin who last updated
  createdAt: Date;
  updatedAt: Date;
}

const cardSchema = new Schema<ICard>({
  name: { type: String, required: true, unique: true },
  card: { type: String, required: true, enum: ['J', 'Q', 'K', 'A', '10'] },
  symbol: { type: String, required: true, enum: ['♣', '♠', '♥', '♦'] },
  suit: { type: String, required: true, enum: ['clubs', 'spades', 'hearts', 'diamonds'] },
  basePrice: { type: Number, required: true, min: 1 },
  currentPrice: { type: Number, required: true, min: 1 },
  isActive: { type: Boolean, default: true },
  totalBids: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  displayOrder: { type: Number, required: true, min: 1 },
  lastPriceUpdate: { type: Date, default: () => getCurrentISTTime() },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export const Card = model<ICard>('Card', cardSchema); 