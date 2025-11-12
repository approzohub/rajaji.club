import { Schema, model, Types, Document } from 'mongoose';

export interface IPayment extends Document {
  user: Types.ObjectId;
  name: string;
  upiId: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>({
  user: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  name: { 
    type: String, 
    required: true,
    trim: true,
    validate: {
      validator: function(v: string) {
        return v.length >= 2 && v.length <= 50;
      },
      message: 'Name must be between 2 and 50 characters'
    }
  },
  upiId: { 
    type: String, 
    required: true,
    trim: true,
    validate: {
      validator: function(v: string) {
        // UPI ID validation: should contain @ and be valid format
        const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+$/;
        return upiRegex.test(v);
      },
      message: 'Please enter a valid UPI ID (e.g., username@bank)'
    }
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  isDefault: { 
    type: Boolean, 
    default: false 
  }
}, { 
  timestamps: true 
});

// Ensure only one default payment method per user
paymentSchema.index({ user: 1, isDefault: 1 }, { 
  unique: true, 
  partialFilterExpression: { isDefault: true } 
});

// Ensure unique UPI ID per user
paymentSchema.index({ user: 1, upiId: 1 }, { unique: true });

export const Payment = model<IPayment>('Payment', paymentSchema); 