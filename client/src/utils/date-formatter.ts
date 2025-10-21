export const formatDateTime = (date: string | Date | undefined): string => {
  if (!date) return 'Null';
  try {
    const dateObj = new Date(date);
    return dateObj.toLocaleString('zh-Hans-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return 'Error';
  }
};

export const formatDate = (date: string | Date | undefined): string => {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleString();
  } catch {
    return '-';
  }
};

export const formatDateDistance = (date: string | Date | undefined): string => {
  if (!date) return '-';
  try {
    const dateObj = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return diffMinutes <= 1 ? 'just now' : `${diffMinutes} minutes ago`;
      }
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    } else if (diffDays === 1) {
      return 'yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return months === 1 ? '1 month ago' : `${months} months ago`;
    } else {
      const years = Math.floor(diffDays / 365);
      return years === 1 ? '1 year ago' : `${years} years ago`;
    }
  } catch {
    return '-';
  }
};

// Helper functions
export function formatDateForInput(date: Date | null): string {
  if (!date) return '';
  try {
    return date.toISOString().slice(0, 16); // Format as YYYY-MM-DDTHH:mm for datetime-local input
  } catch {
    return '';
  }
}
