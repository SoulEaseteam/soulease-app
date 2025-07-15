// src/utils/sendAdminNotification.ts
export const sendTelegramMessage = async (text: string) => {
  const telegramToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
  const telegramChatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;
  const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: telegramChatId, text }),
  });
};

export const sendLineNotify = async (message: string) => {
  const lineToken = import.meta.env.VITE_LINE_NOTIFY_TOKEN;

  await fetch('https://notify-api.line.me/api/notify', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lineToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ message }),
  });
};