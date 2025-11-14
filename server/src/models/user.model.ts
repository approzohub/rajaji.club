import { Schema, model, Types, Document } from 'mongoose';

export interface IUser extends Document {
  fullName: string;
  email?: string;
  phone: string;
  gameId: string;
  password: string;
  assignedAgent?: Types.ObjectId | null;
  role: 'admin' | 'agent' | 'user';
  status: 'active' | 'disabled' | 'banned';
  createdBy: Types.ObjectId;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Function to generate gameId from user name and phone
export function generateGameId(fullName: string, phone: string): string {
  const namePart = fullName.replace(/\s+/g, '').substring(0, 4).toUpperCase();
  const phonePart = phone.replace(/\D/g, '').slice(-5);
  return `${namePart}${phonePart}`;
}

// Phone validation function
export function validatePhone(phone: string): boolean {
  // Indian phone number validation (10 digits, optionally with +91)
  const phoneRegex = /^(\+91)?[6-9]\d{9}$/;
  return phoneRegex.test(phone);
}

const userSchema = new Schema<IUser>(
  {
    fullName: { 
      type: String, 
      required: true,
      validate: {
        validator: function(v: string) {
          return v.length >= 2;
        },
        message: 'Full name must be at least 2 characters long'
      }
    },
    email: { 
      type: String, 
      required: false, 
      lowercase: true,
      trim: true,
      default: undefined,
    },
    phone: { 
      type: String, 
      required: true, 
      unique: true,
      validate: {
        validator: validatePhone,
        message: 'Phone number must be a valid Indian mobile number'
      }
    },
    gameId: { 
      type: String, 
      required: true, 
      unique: true,
      uppercase: true
    },
    password: { type: String, required: true },
    assignedAgent: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    role: { type: String, enum: ['admin', 'agent', 'user'], required: true },
    status: { type: String, enum: ['active', 'disabled', 'banned'], default: 'active' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    mustChangePassword: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { email: { $exists: true, $ne: null } },
    name: 'unique_email_if_present',
  }
);

// Pre-save middleware to generate gameId if not provided
userSchema.pre('save', function(next) {
  if (!this.gameId && this.fullName && this.phone) {
    this.gameId = generateGameId(this.fullName, this.phone);
  }
  next();
});

export const User = model<IUser>('User', userSchema); 