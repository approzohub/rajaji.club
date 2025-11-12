import Image from "next/image";
import React from "react";

interface DeckCardProps {
  value: string; // "A", "2"..."10", "J", "Q", "K"
  suit: string; // "♣", "♦", "♠", "♥"
  selected?: boolean;
  onClick?: () => void;
  imageWidth?: number;
  imageHeight?: number;
}

const suitMap: Record<string, string> = {
  "♣": "clubs",
  "♦": "diamonds",
  "♥": "hearts",
  "♠": "spades",
};
const valueMap: Record<string, string> = {
  "A": "ace",
  "2": "2",
  "3": "3",
  "4": "4",
  "5": "5",
  "6": "6",
  "7": "7",
  "8": "8",
  "9": "9",
  "10": "10",
  "J": "jack",
  "Q": "queen",
  "K": "king",
};

function getCardFilename(value: string, suit: string): string | null {
  const v = valueMap[value];
  const s = suitMap[suit];
  if (!v || !s) return null;
  return `/cards/${v}_of_${s}.png`;
}

export function DeckCard({ value, suit, selected = false, onClick, imageWidth = 100, imageHeight = 100 }: DeckCardProps) {
  const cardImg = getCardFilename(value, suit);
  return (
    <div
      onClick={onClick}
      tabIndex={0}
      role="button"
      aria-label={`${value} of ${suit}`}
      className="w-full h-full cursor-pointer"
      style={{ fontFamily: "Poppins, serif" }}
    >
      {cardImg && (
        <Image
          src={cardImg}
          alt={`${value} of ${suit}`}
          width={imageWidth}
          height={imageHeight}
          className={`w-full h-full object-contain${selected ? " opacity-40" : ""}`}
          draggable={false}
        />
      )}
    </div>
  );
} 