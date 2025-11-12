import { Card } from '../models/card.model';
import { CardPriceHistory } from '../models/card-price-history.model';
import { Bid } from '../models/bid.model';
import { Types } from 'mongoose';
import { getCurrentISTTime } from '../utils/timezone';

// Complete card deck with 5 types × 4 suits = 20 cards
const CARD_DECK = [
  // Jack Cards (4 cards)
  { name: "jack_of_clubs", card: "J", symbol: "♣", suit: "clubs", price: 17 },
  { name: "jack_of_spades", card: "J", symbol: "♠", suit: "spades", price: 11 },
  { name: "jack_of_hearts", card: "J", symbol: "♥", suit: "hearts", price: 13 },
  { name: "jack_of_diamonds", card: "J", symbol: "♦", suit: "diamonds", price: 19 },
  
  // Queen Cards (4 cards)
  { name: "queen_of_clubs", card: "Q", symbol: "♣", suit: "clubs", price: 14 },
  { name: "queen_of_spades", card: "Q", symbol: "♠", suit: "spades", price: 12 },
  { name: "queen_of_hearts", card: "Q", symbol: "♥", suit: "hearts", price: 16 },
  { name: "queen_of_diamonds", card: "Q", symbol: "♦", suit: "diamonds", price: 18 },
  
  // King Cards (4 cards)
  { name: "king_of_clubs", card: "K", symbol: "♣", suit: "clubs", price: 15 },
  { name: "king_of_spades", card: "K", symbol: "♠", suit: "spades", price: 11 },
  { name: "king_of_hearts", card: "K", symbol: "♥", suit: "hearts", price: 20 },
  { name: "king_of_diamonds", card: "K", symbol: "♦", suit: "diamonds", price: 19 },
  
  // Ace Cards (4 cards)
  { name: "ace_of_clubs", card: "A", symbol: "♣", suit: "clubs", price: 10 },
  { name: "ace_of_spades", card: "A", symbol: "♠", suit: "spades", price: 20 },
  { name: "ace_of_hearts", card: "A", symbol: "♥", suit: "hearts", price: 15 },
  { name: "ace_of_diamonds", card: "A", symbol: "♦", suit: "diamonds", price: 13 },
  
  // Ten Cards (4 cards)
  { name: "ten_of_clubs", card: "10", symbol: "♣", suit: "clubs", price: 14 },
  { name: "ten_of_spades", card: "10", symbol: "♠", suit: "spades", price: 12 },
  { name: "ten_of_hearts", card: "10", symbol: "♥", suit: "hearts", price: 16 },
  { name: "ten_of_diamonds", card: "10", symbol: "♦", suit: "diamonds", price: 18 }
];

export class CardService {
  // Initialize all cards in database
  static async initializeCards() {
    const results = [];
    let displayOrder = 1;
    
    for (const card of CARD_DECK) {
      try {
        const result = await Card.findOneAndUpdate(
          { name: card.name },
          { 
            ...card, 
            basePrice: card.price,
            currentPrice: card.price,
            isActive: true,
            displayOrder: displayOrder++
          },
          { upsert: true, new: true }
        );
        results.push({ success: true, card: result });
      } catch (error: any) {
        results.push({ success: false, cardName: card.name, error: error.message });
      }
    }
    return results;
  }
  
  // Get all active cards (for game interface)
  static async getActiveCards() {
    return await Card.find({ isActive: true }).sort({ displayOrder: 1 });
  }
  
  // Get all cards (for admin dashboard)
  static async getAllCards() {
    return await Card.find({}).sort({ displayOrder: 1 });
  }
  
  // Get cards by type
  static async getCardsByType(cardType: string) {
    return await Card.find({ 
      card: cardType, 
      isActive: true 
    }).sort({ displayOrder: 1 });
  }
  
  // Get cards by suit
  static async getCardsBySuit(suit: string) {
    return await Card.find({ 
      suit, 
      isActive: true 
    }).sort({ displayOrder: 1 });
  }
  
  // Update card price by admin
  static async updateCardPrice(
    cardName: string, 
    newPrice: number, 
    adminId: string, 
    reason?: string
  ) {
    const card = await Card.findOne({ name: cardName });
    if (!card) {
      throw new Error('Card not found');
    }
    
    const oldPrice = card.currentPrice;
    
    // Update card price
    card.currentPrice = newPrice;
    card.lastPriceUpdate = getCurrentISTTime();
    card.updatedBy = new Types.ObjectId(adminId);
    await card.save();
    
    // Log price change
    await CardPriceHistory.create({
      cardName,
      oldPrice,
      newPrice,
      changedBy: new Types.ObjectId(adminId),
      reason,
      effectiveFrom: getCurrentISTTime()
    });
    
    return card;
  }
  
  // Get price history for a card
  static async getPriceHistory(cardName: string) {
    return await CardPriceHistory.find({ cardName })
      .populate('changedBy', 'fullName email')
      .sort({ createdAt: -1 });
  }
  
  // Bulk update card prices
  static async bulkUpdatePrices(
    updates: Array<{ cardName: string; newPrice: number }>,
    adminId: string,
    reason?: string
  ) {
    const results = [];
    
    for (const update of updates) {
      try {
        const result = await this.updateCardPrice(
          update.cardName, 
          update.newPrice, 
          adminId, 
          reason
        );
        results.push({ success: true, cardName: update.cardName, result });
      } catch (error: any) {
        results.push({ success: false, cardName: update.cardName, error: error.message });
      }
    }
    
    return results;
  }
  
  // Update card statistics after bid
  static async updateCardStats(cardName: string, amount: number) {
    await Card.findOneAndUpdate(
      { name: cardName },
      { 
        $inc: { 
          totalBids: 1, 
          totalAmount: amount 
        } 
      }
    );
  }
  
  // Get card analytics for a game
  static async getCardAnalytics(gameId: string) {
    const cardStats = await Bid.aggregate([
      { $match: { game: new Types.ObjectId(gameId) } },
      {
        $group: {
          _id: '$cardName',
          totalBids: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          uniqueBidders: { $addToSet: '$user' },
          averageBidAmount: { $avg: '$totalAmount' }
        }
      },
      {
        $lookup: {
          from: 'cards',
          localField: '_id',
          foreignField: 'name',
          as: 'cardInfo'
        }
      },
      {
        $project: {
          cardName: '$_id',
          cardType: { $arrayElemAt: ['$cardInfo.card', 0] },
          cardSuit: { $arrayElemAt: ['$cardInfo.suit', 0] },
          symbol: { $arrayElemAt: ['$cardInfo.symbol', 0] },
          totalBids: 1,
          totalAmount: 1,
          uniqueBidders: { $size: '$uniqueBidders' },
          averageBidAmount: { $round: ['$averageBidAmount', 2] }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);
    
    // Add popularity rank
    return cardStats.map((stat: any, index: number) => ({
      ...stat,
      popularityRank: index + 1
    }));
  }

  // Update card display order
  static async updateCardDisplayOrder(cardName: string, newOrder: number, adminId: string) {
    const card = await Card.findOne({ name: cardName });
    if (!card) {
      throw new Error('Card not found');
    }

    const oldOrder = card.displayOrder;
    
    // Check if the new order is valid
    if (newOrder < 1) {
      throw new Error('Display order must be at least 1');
    }

    // Get the maximum display order to ensure we don't exceed it
    const maxOrder = await Card.countDocuments();
    if (newOrder > maxOrder) {
      throw new Error(`Display order cannot exceed ${maxOrder}`);
    }

    // If moving to a higher position, shift other cards down
    if (newOrder > oldOrder) {
      await Card.updateMany(
        { 
          displayOrder: { $gt: oldOrder, $lte: newOrder },
          _id: { $ne: card._id }
        },
        { $inc: { displayOrder: -1 } }
      );
    }
    // If moving to a lower position, shift other cards up
    else if (newOrder < oldOrder) {
      await Card.updateMany(
        { 
          displayOrder: { $gte: newOrder, $lt: oldOrder },
          _id: { $ne: card._id }
        },
        { $inc: { displayOrder: 1 } }
      );
    }

    // Update the target card
    card.displayOrder = newOrder;
    card.updatedBy = new Types.ObjectId(adminId);
    await card.save();

    return { card, oldOrder, newOrder };
  }

  // Bulk update display orders
  static async bulkUpdateDisplayOrders(
    updates: Array<{ cardName: string; newOrder: number }>,
    adminId: string
  ) {
    const results = [];
    
    for (const update of updates) {
      try {
        const result = await this.updateCardDisplayOrder(
          update.cardName, 
          update.newOrder, 
          adminId
        );
        results.push({ success: true, cardName: update.cardName, result });
      } catch (error: any) {
        results.push({ success: false, cardName: update.cardName, error: error.message });
      }
    }
    
    return results;
  }

  // Initialize display orders for all cards (run once after adding displayOrder field)
  static async initializeDisplayOrders() {
    const cards = await Card.find({}).sort({ card: 1, suit: 1 });
    let order = 1;
    
    for (const card of cards) {
      card.displayOrder = order++;
      await card.save();
    }
    
    return { message: `Initialized display orders for ${cards.length} cards` };
  }
} 