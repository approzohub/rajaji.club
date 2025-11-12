import { Schema, model, Types, Document } from 'mongoose';

export interface IManualOverride extends Document {
  game: Types.ObjectId;
  winnerNumber: number;
  manualWinners: Types.ObjectId[];
  note?: string;
  payoutMultiplier?: number;
  createdAt: Date;
  updatedAt: Date;
}

const manualOverrideSchema = new Schema<IManualOverride>({
  game: { type: Schema.Types.ObjectId, ref: 'Game', required: true },
  winnerNumber: { type: Number, required: true },
  manualWinners: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  note: { type: String },
  payoutMultiplier: { type: Number },
}, { timestamps: true });

export const ManualOverride = model<IManualOverride>('ManualOverride', manualOverrideSchema); 