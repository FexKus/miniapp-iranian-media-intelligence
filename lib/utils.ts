import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function linkifyUrls(text: string): string {
  return text.replace(
    /(?<!\]\()(?<!\[)(https?:\/\/[^\s)\]>]+)/g,
    '[$1]($1)'
  );
}

export function getErrorMessage(error: unknown, fallback = 'An unexpected error occurred'): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'string' && error.length > 0) {
    return error;
  }
  return fallback;
}
