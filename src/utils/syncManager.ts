// src/utils/syncManager.ts
// ابزار همگام‌سازی فرانت‌اند با سرور ابری کلودفلر

export const syncManager = {
  // دریافت اطلاعات از سرور هنگام ورود به مرورگر جدید
  async pullFromServer(userId: string) {
    try {
      const response = await fetch('/api/state', {
        headers: {
            'x-user-id': userId
        }
      });
      
      if (response.ok) {
        const serverData = await response.json();
        console.log('Data synced from Cloudflare KV successfully');
        return serverData;
      }
      return null;
    } catch (error) {
      console.error('Failed to pull data from server:', error);
      return null;
    }
  },

  // ارسال اطلاعات به سرور پس از هر تغییر لوکال
  async pushToServer(userId: string, localData: any) {
    try {
      const response = await fetch('/api/state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify(localData),
      });
      
      if (response.ok) {
         console.log('Data saved to Cloudflare KV successfully');
      }
    } catch (error) {
      console.error('Failed to push data to server:', error);
    }
  }
};
