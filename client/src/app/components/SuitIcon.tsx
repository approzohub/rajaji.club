import Image from "next/image";

const suitMap: Record<string, string> = {
  "♥": "/card-icon/icon_of_hearts.svg",
  "♦": "/card-icon/icon_of_diamonds.svg",
  "♣": "/card-icon/icon_of_clubs.svg",
  "♠": "/card-icon/icon_of_spades.svg",
};

interface SuitIconProps {
  suit: string;
  size?: number;
  className?: string;
}

export function SuitIcon({ suit, size = 20, className = "" }: SuitIconProps) {
  const src = suitMap[suit] || "";
  if (!src) return null;
  return (
    <Image
      src={src}
      alt={suit}
      width={size}
      height={size}
      className={className}
      style={{ display: "inline-block", verticalAlign: "text-bottom" }}
    />
  );
} 