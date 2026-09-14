// src/hooks/useAppSync.ts
import { useEffect, useState } from 'react';
import { syncManager } from '../utils/syncManager';
// فرض می‌کنیم store محلی خود را ایمپورت کرده‌اید
// import { useStore } from '../store'; 

export function useAppSync(userId: string) {
  const [isSyncing, setIsSyncing] = useState(true);

  // فراخوانی داده‌ها در زمان لود اولیه برنامه
  useEffect(() => {
    async function loadInitialData() {
      setIsSyncing(true);
      const serverState = await syncManager.pullFromServer(userId);
      
      if (serverState && Object.keys(serverState).length > 0) {
        // اطلاعات از سرور دریافت شد، حالا باید استیت لوکال را آپدیت کنید
        // useStore.getState().setAllData(serverState);
      }
      setIsSyncing(false);
    }

    if (userId) {
      loadInitialData();
    }
  }, [userId]);

  // تابعی برای ذخیره همزمان تغییرات در مرورگر و سرور
  const saveState = async (newState: any) => {
    // 1. ذخیره محلی (آپدیت استیت منیجر کلاینت)
    // useStore.getState().update(newState);
    
    // 2. ارسال به سرور برای دسترسی در مرورگرهای دیگر
    await syncManager.pushToServer(userId, newState);
  };

  return { isSyncing, saveState };
}
