import { Schema, model, Document, Types } from 'mongoose';
import { getCurrentISTTime } from '../utils/timezone';

export interface ICommissionSettings extends Document {
  adminCommissionPercentage: number; // Percentage of total pool that goes to admin
  agentCommissionPercentage: number; // Percentage of total pool that goes to agents
  winnerPayoutPercentage: number; // Percentage of total pool that goes to winners
  minBetAmount: number; // Minimum bet amount
  maxBetAmount: number; // Maximum bet amount
  minUserRechargeAmount: number; // Minimum recharge amount for users
  minAgentRechargeAmount: number; // Minimum recharge amount for agents
  isActive: boolean; // Current active settings
  updatedBy: Types.ObjectId; // Admin who last updated these settings
  effectiveFrom: Date; // When these settings take effect
  createdAt: Date;
  updatedAt: Date;
}

const commissionSettingsSchema = new Schema<ICommissionSettings>({
  adminCommissionPercentage: { 
    type: Number, 
    required: true, 
    min: 0, 
    max: 100,
    default: 10 // Default 10% commission for admin
  },
  agentCommissionPercentage: { 
    type: Number, 
    required: true, 
    min: 0, 
    max: 100,
    default: 5 // Default 5% commission for agents
  },
  winnerPayoutPercentage: { 
    type: Number, 
    required: true, 
    min: 0, 
    max: 100,
    default: 85 // Default 85% goes to winners
  },
  minBetAmount: { 
    type: Number, 
    required: true, 
    min: 1,
    default: 10 // Default minimum bet ₹10
  },
  maxBetAmount: { 
    type: Number, 
    required: true, 
    min: 1,
    default: 10000 // Default maximum bet ₹10,000
  },
  minUserRechargeAmount: { 
    type: Number, 
    required: true, 
    min: 1,
    default: 100 // Default minimum recharge ₹100 for users
  },
  minAgentRechargeAmount: { 
    type: Number, 
    required: true, 
    min: 1,
    default: 500 // Default minimum recharge ₹500 for agents
  },
  isActive: { type: Boolean, default: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  effectiveFrom: { type: Date, default: () => getCurrentISTTime() }
}, { timestamps: true });

// Ensure percentages add up to 100% or less
commissionSettingsSchema.pre('save', function(next) {
  const total = this.adminCommissionPercentage + this.agentCommissionPercentage + this.winnerPayoutPercentage;
  if (total > 100) {
    return next(new Error('Total percentages cannot exceed 100%'));
  }
  next();
});

export const CommissionSettings = model<ICommissionSettings>('CommissionSettings', commissionSettingsSchema); 