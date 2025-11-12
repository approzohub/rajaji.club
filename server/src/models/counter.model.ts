import { Schema, model, Document } from 'mongoose';

export interface ICounter extends Document {
  name: string;
  sequence: number;
}

const counterSchema = new Schema<ICounter>({
  name: { type: String, required: true, unique: true },
  sequence: { type: Number, default: 1 },
});

export const Counter = model<ICounter>('Counter', counterSchema); 