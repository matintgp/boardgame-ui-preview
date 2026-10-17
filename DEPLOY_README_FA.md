# BoardGame — Unified UI Preview

پروژه اصلی دمو V13 بدون تغییر بک‌اند به‌عنوان صفحه اصلی در `/` قرار دارد.

- `/` — صفحه اصلی، حساب نمایشی، معرفی بازی‌ها و میزها
- `/#game/chess/lobby` و `/#game/chess/play` — شطرنج
- `/#game/mafia/lobby` و `/#game/mafia/play` — مافیا V13
- `/salem/` — Salem V2، لابی و بازی محلی
- `/#game/rokugan` — معرفی روکوگان، هنوز فاقد بازی تعاملی

هیچ اتصال بک‌اند آنلاین، Matchmaking یا WebRTC اجرا نشده؛ رابط‌های مربوطه دموی تعاملی هستند.

## انتشار روی Vercel

فایل‌های ریشه همین پوشه را در ریشه مخزن boardgame-ui-preview قرار دهید؛ Vercel با Preset Other منتشر می‌کند.
