import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date as "MMM DD, YYYY (x ago)"
 * Example: "Dec 04, 2025 (2 days ago)"
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return 'N/A';
  
  const formattedDate = format(dateObj, 'MMM dd, yyyy');
  const relativeTime = formatDistanceToNow(dateObj, { addSuffix: true });
  
  return `${formattedDate} (${relativeTime})`;
}

/**
 * Format a date as relative time only "x ago"
 * Example: "2 days ago"
 */
export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return 'N/A';
  
  return formatDistanceToNow(dateObj, { addSuffix: true });
}
