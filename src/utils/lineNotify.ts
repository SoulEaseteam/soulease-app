// src/utils/lineNotify.ts
export const sendLineNotify = async (message: string) => {
  const token = 'YOUR_LINE_NOTIFY_TOKEN_HERE'; // 🔐 เปลี่ยนตรงนี้
  const url = 'https://notify-api.line.me/api/notify';

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ message })
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Line Notify Error:', errorText);
    }
  } catch (err) {
    console.error('Network Error while sending Line Notify:', err);
  }
};