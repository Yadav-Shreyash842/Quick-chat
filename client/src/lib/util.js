export function formatMessageTime(date) {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function formatLastSeen(date) {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function formatMessageDate(date) {
  const now = new Date();
  const msgDate = new Date(date);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate());
  
  if (msgDay.getTime() === today.getTime()) {
    return `Today, ${formatMessageTime(date)}`;
  } else if (msgDay.getTime() === today.getTime() - 86400000) {
    return `Yesterday, ${formatMessageTime(date)}`;
  } else {
    return msgDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
