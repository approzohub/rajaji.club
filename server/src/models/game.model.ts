import { Schema, model, Document } from 'mongoose';

export interface IGame extends Document {
  timeWindow: string;
  status: 'open' | 'waiting_result' | 'result_declared';
  totalPool: number;
  winningCard?: string;        // Card name that won
  startTime: Date;
  biddingEndTime: Date;
  gameEndTime: Date;
  resultDeclaredAt?: Date;
  declaredBy?: any; // Admin who declared result
  isRandomResult: boolean;     // true if random, false if manual
  createdAt: Date;
  updatedAt: Date;
}

const gameSchema = new Schema<IGame>({
  timeWindow: { type: String, required: true },
  status: { type: String, enum: ['open', 'waiting_result', 'result_declared'], required: true },
  totalPool: { type: Number, default: 0 },
  winningCard: { type: String },
  startTime: { type: Date, required: true },
  biddingEndTime: { type: Date, required: true },
  gameEndTime: { type: Date, required: true },
  resultDeclaredAt: { type: Date },
  declaredBy: { type: Schema.Types.ObjectId, ref: 'User' },
  isRandomResult: { type: Boolean, default: true }
}, { timestamps: true });

// Indexes for better query performance
gameSchema.index({ status: 1, resultDeclaredAt: -1 }); // For completed games queries
gameSchema.index({ timeWindow: 1 }, { unique: true }); // Unique timeWindow index
gameSchema.index({ startTime: -1 }); // For game ordering

export const Game = model<IGame>('Game', gameSchema); 