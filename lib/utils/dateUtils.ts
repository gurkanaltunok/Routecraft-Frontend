/**
 * Format a date to user's local timezone
 * @param dateString - ISO date string (UTC)
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string in user's local timezone
 */
export function formatLocalDate(
  dateString: string,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }
): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, options);
  } catch {
    return dateString;
  }
}

/**
 * Format a date to user's local timezone with time
 * @param dateString - ISO date string (UTC)
 * @returns Formatted date and time string in user's local timezone
 */
export function formatLocalDateTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

/**
 * Format time only in user's local timezone
 * @param dateString - ISO date string (UTC)
 * @returns Formatted time string in user's local timezone
 */
export function formatLocalTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

/**
 * Get relative time (e.g., "2 hours ago", "3 days ago")
 * @param dateString - ISO date string (UTC)
 * @returns Relative time string
 */
export function getRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    const months = Math.floor(diff / 2592000000);
    const years = Math.floor(diff / 31536000000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 30) return `${days}d ago`;
    if (months < 12) return `${months}mo ago`;
    return `${years}y ago`;
  } catch {
    return dateString;
  }
}

/**
 * Format "Member since" date
 * @param dateString - ISO date string (UTC)
 * @returns Formatted member since string (e.g., "December 24, 2024")
 */
export function formatMemberSince(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Format chat message time - shows time for today, date for older
 * @param dateString - ISO date string (UTC)
 * @returns Formatted string for chat messages
 */
export function formatChatTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    
    // For older messages, show the date
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Format full chat message timestamp for tooltip/detailed view
 * @param dateString - ISO date string (UTC)
 * @returns Full formatted date and time in user's local timezone
 */
export function formatChatTimestamp(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeStr = date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });

    if (isToday) {
      return `Today at ${timeStr}`;
    }
    if (isYesterday) {
      return `Yesterday at ${timeStr}`;
    }
    
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}
