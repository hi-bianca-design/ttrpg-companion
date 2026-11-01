import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// Custom font-size roles (see tailwind.config.js) registered so `text-title`
// is treated as a font size, not a colour, and doesn't collide with `text-foreground`.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        { text: ['display', 'title', 'heading', 'subhead', 'body', 'body-sm', 'stat', 'label', 'caption'] },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
