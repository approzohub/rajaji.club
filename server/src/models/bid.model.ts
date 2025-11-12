import { Schema, model, Types, Document } from 'mongoose';

export interface IBid extends Document {
  user: Types.ObjectId;
  game: Types.ObjectId;
  cardName: string;           // Which card was bid on
  cardType: string;           // J, Q, K, A, 10
  cardSuit: string;           // clubs, spades, hearts, diamonds
  quantity: number;           // How many cards bought
  totalAmount: number;        // quantity * cardPrice
  cardPrice: number;          // Price per card at time of bid
  createdAt: Date;
}

const bidSchema = new Schema<IBid>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  game: { type: Schema.Types.ObjectId, ref: 'Game', required: true },
  cardName: { type: String, required: true },
  cardType: { type: String, required: true, enum: ['J', 'Q', 'K', 'A', '10'] },
  cardSuit: { type: String, required: true, enum: ['clubs', 'spades', 'hearts', 'diamonds'] },
  quantity: { type: Number, required: true, min: 1 },
  totalAmount: { type: Number, required: true, min: 1 },
  cardPrice: { type: Number, required: true, min: 1 }
}, { timestamps: { createdAt: true, updatedAt: false } });

// Indexes for better query performance
bidSchema.index({ user: 1, createdAt: -1 }); // For user game history queries
bidSchema.index({ game: 1, user: 1 }); // For game-specific user bids
bidSchema.index({ user: 1, game: 1, cardName: 1 }); // For grouping bids by card



export const Bid = model<IBid>('Bid', bidSchema); 