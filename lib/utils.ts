import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge the design-system type utilities from app/globals.css so it
// treats them as font sizes / shadows (not colours) and keeps them next to text-muted-foreground.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["2xs", "eyebrow", "display", "title"] }],
      shadow: [{ shadow: ["card", "overlay"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
