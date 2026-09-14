# گزارش بازسازی سامانه جامع مدیریت عملکرد اصفهان چالاک — نسخه ۲

تاریخ تحویل: ۱۴۰۵/۰۶/۲۳ (2026-09-14)

## نتیجه اجرایی

پروژه از روی بسته اولیه استخراج، ساختار آن تحلیل و نسخه‌ای تمیز و قابل استقرار برای Cloudflare Pages بازسازی شد. بسته اصلی کاربر بدون تغییر باقی مانده و خروجی تحویلی یک کپی مستقل است.

سامانه یک برنامه فارسی RTL برای مدیریت کارکنان، پروفایل‌های شغلی، بانک شاخص‌ها، ارزیابی، کالیبراسیون، گردش کار، گزارش‌ها، پاداش، OKR، جلسات یک‌به‌یک، قدردانی، بهره‌وری، پشتیبانی و تحلیل هوشمند Gemini است.

## معماری نهایی

- `src/`: رابط React 19 و TypeScript، منطق دامنه و ذخیره‌سازی offline-first
- `functions/api/`: Cloudflare Pages Functions برای ورود، نشست، همگام‌سازی state و Gemini
- `cloudflare/`: احراز هویت، کوکی امن، PBKDF2 و ابزارهای مشترک Worker
- `public/`: هدرهای امنیتی، قواعد routing و فایل‌های ایستا
- `tests/`: تست‌های موتور فرمول، کنترل دسترسی، احراز هویت و فایل‌های XLSX/CSV
- `wrangler.jsonc`: تنظیم Pages، سازگاری Worker و binding پایگاه KV

## مهم‌ترین مشکلاتی که رفع شد

### امنیت و داده

- API عمومی و بدون احراز هویت `/api/state` به API نشست‌محور و نقش‌محور تبدیل شد.
- رمزهای عبور از payload همگام‌سازی، backup و خروجی CSV حذف شدند.
- رمزها در KV با PBKDF2/SHA-256 و salt تصادفی ذخیره می‌شوند.
- نشست‌ها با token تصادفی و کوکی `HttpOnly + Secure + SameSite=Strict` پیاده‌سازی شدند.
- دسترسی مدیر، سرپرست و کارمند در سرور و رابط به‌صورت مستقل محدود شد.
- محدودیت اندازه درخواست، کنترل Content-Type و rate limit برای درخواست‌های AI اضافه شد.
- هدرهای CSP، HSTS، ضد clickjacking و `noindex` افزوده شد.
- fallback ورود محلی فقط در حالت توسعه فعال است و در production احراز هویت سرور دور زده نمی‌شود.
- کتابخانه آسیب‌پذیر `xlsx` حذف و با ExcelJS به‌همراه `uuid` اصلاح‌شده جایگزین شد؛ ممیزی نهایی صفر آسیب‌پذیری شناخته‌شده دارد.

### منطق و باگ‌ها

- اجرای ناامن فرمول‌ها با `new Function` حذف و parser عددی محدود و قابل تست جایگزین شد.
- عملگر توان `^` که قبلاً به‌اشتباه XOR جاوااسکریپت بود اصلاح شد.
- خطای temporal-dead-zone در محاسبه نمره ارزیابی شخصی رفع شد.
- چند مسیر ذخیره‌سازی که state ابری را ناقص یا کامل overwrite می‌کردند اصلاح شدند.
- حذف و ویرایش گروهی کارکنان، شاخص‌ها، ارزیابی‌ها و پروفایل‌ها به ذخیره‌سازی پایدار متصل شد.
- دو به‌روزرسانی state هنگام render در React که باعث هشدار و رفتار ناپایدار می‌شدند رفع شدند.
- پیکربندی Vite که مانع HMR و مشاهده تغییرات واقعی می‌شد اصلاح شد.
- ورود/خروجی Excel بازنویسی و برای XLSX و CSV تست شد. فرمت قدیمی XLS عمداً پشتیبانی نمی‌شود.

### کارایی و پاک‌سازی

- صفحات سنگین با `React.lazy` و `Suspense` تفکیک شدند.
- باندل اولیه production از حدود ۲٫۱۲ مگابایت به حدود ۴۴۸ کیلوبایت کاهش یافت.
- ExcelJS فقط هنگام استفاده از قابلیت Excel بارگذاری می‌شود.
- بیش از ۶۰ اسکریپت patch/fix موقت، سرور Express بلااستفاده، lockfileهای تکراری و تنظیمات متناقض Cloudflare حذف شدند.
- بسته تحویلی فاقد `node_modules`، `dist` و خروجی‌های موقت Wrangler است.

## کنترل کیفیت انجام‌شده

- `npm run typecheck`: موفق
- `vitest`: چهار فایل و ۱۴ تست، همگی موفق
- `npm run build`: موفق
- `wrangler pages functions build`: موفق
- `npm audit`: صفر آسیب‌پذیری
- آزمون کامل محلی Cloudflare: ورود مدیر و کارمند، نشست، خواندن و نوشتن state، جداسازی نقش‌ها، جلوگیری از دستکاری نقش، تغییر/بازنشانی رمز و مسدودسازی حساب موفق بود.
- آزمون رابط در دسکتاپ و موبایل 390×844 روی ۱۲ بخش اصلی انجام شد؛ منوی موبایل و نبود overflow افقی نیز بررسی شد.

## استقرار روی Cloudflare Pages

1. Node.js نسخه ۲۰ یا جدیدتر و Wrangler را در محیط build در دسترس قرار دهید.
2. یک Pages project و Workers KV namespace بسازید.
3. binding با نام دقیق `CHALAK_DB` را متصل کنید. اگر namespace شما متفاوت است، مقدار `id` در `wrangler.jsonc` را تغییر دهید.
4. دو secret زیر را در Cloudflare ثبت کنید:

   ```bash
   npx wrangler pages secret put ADMIN_PASSWORD --project-name chalak-performance
   npx wrangler pages secret put GEMINI_API_KEY --project-name chalak-performance
   ```

5. استقرار مستقیم:

   ```bash
   npm ci
   npm run deploy
   ```

برای اتصال Git، build command برابر `npm run build` و output directory برابر `dist` است. جزئیات routing و bindings در مستندات رسمی [Pages Functions routing](https://developers.cloudflare.com/pages/functions/routing/)، [Wrangler configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/) و [Pages bindings](https://developers.cloudflare.com/pages/functions/bindings/) آمده است.

## ملاحظات عملیاتی

- `ADMIN_PASSWORD` را حداقل ۱۲ نویسه، تصادفی و منحصربه‌فرد انتخاب کنید.
- رمز اولیه هر کاربر جدید کد پرسنلی او است؛ مدیر باید بلافاصله از مرکز مدیریت یک رمز تصادفی حداقل ۸ نویسه‌ای برای او تعیین کند.
- قابلیت‌های AI بدون `GEMINI_API_KEY` کار نمی‌کنند، اما سایر بخش‌های سامانه مستقل‌اند.
- KV برای سازمان کوچک/متوسط مناسب است، ولی transaction رابطه‌ای یا جلوگیری کامل از تداخل ویرایش هم‌زمان چند مدیر را فراهم نمی‌کند. برای بار بالا، چند مدیر هم‌زمان یا گزارش‌گیری سنگین، مهاجرت state به Cloudflare D1 توصیه می‌شود.
- فایل‌های Excel/JSON شامل اطلاعات منابع انسانی هستند و باید مشمول سیاست دسترسی و نگهداری داده سازمان باشند.
