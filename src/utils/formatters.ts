// Format runtime from ticks to minutes
export const formatRuntime = (ticks?: number) => {
  if (!ticks) return '';
  
  const totalMinutes = Math.floor(ticks / (10000 * 1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

// Format date to year only
export const formatYear = (dateString?: string) => {
  if (!dateString) return '';
  return new Date(dateString).getFullYear();
};

// Format time in seconds to mm:ss format
export const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};