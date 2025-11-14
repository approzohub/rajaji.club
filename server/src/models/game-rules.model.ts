import mongoose, { Document, Schema } from 'mongoose';

export interface IGameRules extends Document {
  text: string;
  updatedAt: Date;
  createdAt: Date;
}

const gameRulesSchema = new Schema<IGameRules>({
  text: {
    type: String,
    required: true,
    default: ''
  }
}, {
  timestamps: true
});

// Ensure only one game rules document exists
gameRulesSchema.index({}, { unique: true });

export const GameRules = mongoose.model<IGameRules>('GameRules', gameRulesSchema);

