// Card utility functions for consistent formatting across the admin dashboard
export interface Card {
  _id: string;
  name: string;
  card: string;
  symbol: string;
  suit: string;
  isActive: boolean;
  currentPrice: number;
  displayOrder: number;
}

/**
 * Formats a card name consistently across the application
 * @param card - The card object
 * @param format - The format to use ('display', 'symbol', 'full')
 * @returns Formatted card string
 */
export function formatCardName(card: Card, format: 'display' | 'symbol' | 'full' = 'display'): string {
  switch (format) {
    case 'display':
      // Format: "K ♦" (card + symbol)
      return `${card.card} ${card.symbol}`;
    
    case 'symbol':
      // Format: "♦" (just the symbol)
      return card.symbol;
    
    case 'full':
      // Format: "KING OF DIAMONDS" (full name uppercase)
      return card.name.replace(/_/g, ' ').toUpperCase();
    
    default:
      return `${card.card} ${card.symbol}`;
  }
}

/**
 * Gets the color for a card suit
 * @param suit - The card suit
 * @returns Color string
 */
export function getSuitColor(suit: string): string {
  switch (suit.toLowerCase()) {
    case 'hearts':
    case 'diamonds':
      return '#d32f2f'; // Red
    case 'clubs':
    case 'spades':
      return '#1976d2'; // Blue
    default:
      return '#757575'; // Grey
  }
}

/**
 * Formats a card for display in tables and lists
 * @param card - The card object
 * @returns Formatted card display object
 */
export function formatCardForDisplay(card: Card) {
  return {
    id: card._id,
    displayName: formatCardName(card, 'display'), // "K ♦"
    symbol: formatCardName(card, 'symbol'), // "♦"
    fullName: formatCardName(card, 'full'), // "KING OF DIAMONDS"
    suitColor: getSuitColor(card.suit),
    price: card.currentPrice,
    isActive: card.isActive
  };
}
