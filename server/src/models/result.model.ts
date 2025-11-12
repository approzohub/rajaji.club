import { Schema, model, Document, Types } from 'mongoose';

export interface IWinner {
  userId: Types.ObjectId;
  userName: string;
  userEmail: string;
  gameId?: string; // Made optional since it might not be available
  bidAmount: number;
  payoutAmount: number;
  cardName: string;
  cardType: string;
  cardSuit: string;
  quantity: number;
  assignedAgent?: Types.ObjectId;
}

export interface IAgentCommission {
  agentId: Types.ObjectId;
  agentName: string;
  agentEmail: string;
  commissionAmount: number;
  winnersCount: number;
}

export interface IResult extends Document {
  game: Types.ObjectId;                    // Reference to the game
  gameId: string;                          // Game ID for easy reference
  winningCard: string;                     // Which card won (e.g., "A♥")
  winningCardType: string;                 // Card type (A, K, Q, J, 10)
  winningCardSuit: string;                 // Card suit (hearts, diamonds, clubs, spades)
  totalPool: number;                       // Total game pool amount
  winningCardPool: number;                 // Total pool amount for winning card only
  losingCardsPool: number;                 // Total pool amount for losing cards
  totalWinners: number;                    // Number of winners
  totalWinningAmount: number;              // Total amount distributed to winners
  adminCommission: number;                 // Admin commission amount from winning card
  totalAgentCommission: number;            // Total agent commission
  winners: IWinner[];                      // Array of winners with details
  agentCommissions: IAgentCommission[];    // Array of agent commissions
  isRandomResult: boolean;                 // Whether result was random or manual
  declaredBy?: Types.ObjectId;             // Admin who declared result (if manual)
  resultDeclaredAt: Date;                  // When result was declared
  gameStartTime: Date;                     // Game start time
  gameEndTime: Date;                       // Game end time
  biddingEndTime: Date;                    // Bidding end time
  createdAt: Date;
  updatedAt: Date;
}

const winnerSchema = new Schema<IWinner>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  gameId: { type: String, required: false }, // Made optional since it might not be available
  bidAmount: { type: Number, required: true },
  payoutAmount: { type: Number, required: true },
  cardName: { type: String, required: true },
  cardType: { type: String, required: true },
  cardSuit: { type: String, required: true },
  quantity: { type: Number, required: true },
  assignedAgent: { type: Schema.Types.ObjectId, ref: 'User' }
}, { _id: false });

const agentCommissionSchema = new Schema<IAgentCommission>({
  agentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  agentName: { type: String, required: true },
  agentEmail: { type: String, required: true },
  commissionAmount: { type: Number, required: true },
  winnersCount: { type: Number, required: true }
}, { _id: false });

const resultSchema = new Schema<IResult>({
  game: { type: Schema.Types.ObjectId, ref: 'Game', required: true },
  gameId: { type: String, required: true },
  winningCard: { type: String, required: true },
  winningCardType: { type: String, required: true },
  winningCardSuit: { type: String, required: true },
  totalPool: { type: Number, required: true },
  winningCardPool: { type: Number, required: true },
  losingCardsPool: { type: Number, required: true },
  totalWinners: { type: Number, required: true },
  totalWinningAmount: { type: Number, required: true },
  adminCommission: { type: Number, required: true },
  totalAgentCommission: { type: Number, required: true },
  winners: [winnerSchema],
  agentCommissions: [agentCommissionSchema],
  isRandomResult: { type: Boolean, required: true },
  declaredBy: { type: Schema.Types.ObjectId, ref: 'User' },
  resultDeclaredAt: { type: Date, required: true },
  gameStartTime: { type: Date, required: true },
  gameEndTime: { type: Date, required: true },
  biddingEndTime: { type: Date, required: true }
}, { timestamps: true });

// Indexes for better query performance
resultSchema.index({ game: 1 });
resultSchema.index({ gameId: 1 });
resultSchema.index({ resultDeclaredAt: -1 });
resultSchema.index({ 'winners.userId': 1 });
resultSchema.index({ 'agentCommissions.agentId': 1 });

export const Result = model<IResult>('Result', resultSchema); 