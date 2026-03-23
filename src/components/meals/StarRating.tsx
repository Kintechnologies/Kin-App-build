"use client";

import { useState } from "react";
import { Star } from "lucide-react";

interface Props {
  currentRating: number;
  onRate: (rating: number) => void;
  size?: "sm" | "md";
}

export default function StarRating({ currentRating, onRate, size = "sm" }: Props) {
  const [hoverRating, setHoverRating] = useState(0);
  const starSize = size === "sm" ? 14 : 18;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= (hoverRating || currentRating);
        return (
          <button
            key={star}
            onClick={(e) => {
              e.stopPropagation();
              onRate(star);
            }}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="transition-all hover:scale-125 active:scale-90"
          >
            <Star
              size={starSize}
              className={`transition-colors ${
                isFilled ? "fill-amber text-amber" : "text-warm-white/20 hover:text-amber/50"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
