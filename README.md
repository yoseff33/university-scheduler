# فايبز | Vibes — المرحلة الأولى

هذه نسخة تنفيذية للمرحلة الأولى فقط من منصة فايبز. تشمل مشروع React + TypeScript + Vite + Tailwind، ربط Supabase، تسجيل دخول حقيقي برقم الجوال وOTP، ملفاً شخصياً برقم عضوية فريد من 7 أرقام، صورة خاصة في Supabase Storage، RLS، سجل تدقيق أساسي، PWA، وWorkflow للنشر على GitHub Pages.

## ما تم تنفيذه

- `HashRouter` حتى تعمل المسارات داخل GitHub Pages.
- عميل Supabase لا يُنشأ إلا عند وجود قيم بيئة حقيقية.
- تسجيل الدخول عبر `signInWithOtp` والتحقق عبر `verifyOtp`.
- لا يظهر OTP تجريبي ولا يتم تسجيل دخول وهمي.
- إنشاء `profiles` تلقائياً بعد إنشاء مستخدم في `auth.users`.
- رقم عضوية فريد من 7 أرقام، ويعرض بصيغة `VIB-1234567`.
- دور افتراضي `customer` ودور `super_admin` للتهيئة الأولى.
- تعديل الملف الشخصي من خلال RPC آمنة، وليس تحديثاً مباشراً للجدول.
- منع العميل من تعديل رقم العضوية أو رقم الجوال أو الدور.
- Bucket خاص للصور الشخصية، والملفات مقيدة بمجلد المستخدم.
- الخدمات غير المنفذة في المراحل اللاحقة تظهر باسم «الخدمة غير مفعلة حالياً».
- PWA بدون Runtime Cache لبيانات Supabase.
- GitHub Actions يبني وينشر مجلد `dist`.

## المتطلبات المحلية

- Node.js 22 أو إصدار مدعوم من Vite.
- npm.
- مشروع Supabase.

## التشغيل محلياً

```bash
npm install
cp .env.example .env.local
npm run dev
```

في ويندوز PowerShell:

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

عدّل `.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
VITE_APP_NAME=فايبز
VITE_APP_BASE_URL=http://localhost:5173
```

> لا تضع `service_role` في Vite أو GitHub. الواجهة تستخدم المفتاح العام فقط، والحماية الفعلية تعتمد على RLS.

## إعداد قاعدة البيانات

نفّذ الملف التالي مرة واحدة عبر Supabase SQL Editor أو Supabase CLI:

```text
supabase/migrations/202607260001_phase_1_foundation.sql
```

المهاجرة تنشئ:

- `profiles`
- `user_roles`
- `audit_logs`
- دالة `has_role`
- دالة `update_my_profile`
- Trigger إنشاء الملف الشخصي
- سياسات RLS
- Bucket `avatars` وسياساته

بعد تشغيل المهاجرة، أنشئ/سجّل دخول المستخدم الأول، ثم خذ UUID من:

```text
Supabase Dashboard → Authentication → Users
```

عدّل UUID في:

```text
supabase/bootstrap_first_admin.sql
```

وشغّل الملف مرة واحدة فقط. السكربت يرفض العمل إذا وجد مديراً عاماً موجوداً مسبقاً.

## إعداد تسجيل الدخول برقم الجوال

داخل Supabase Dashboard:

1. افتح `Authentication → Providers → Phone`.
2. فعّل Phone Auth.
3. اربط مزوّد SMS فعلياً.
4. اضبط Rate Limits وCAPTCHA قبل الإنتاج.
5. أضف روابط الموقع المحلي ورابط GitHub Pages في إعدادات URL/Redirects.

إذا لم يتم إعداد المزوّد، الواجهة لن تعرض نجاحاً وهمياً؛ ستوضح أن تسجيل الدخول برقم الجوال غير مفعّل.

## النشر على GitHub Pages

1. ارفع المشروع إلى مستودع GitHub واجعل الفرع الرئيسي `main`.
2. من `Settings → Pages` اختر `GitHub Actions` كمصدر النشر.
3. أضف Repository Secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. أضف Repository Variable باسم `VITE_APP_BASE_URL` بالقيمة النهائية، مثال:

```text
https://YOUR_USERNAME.github.io/YOUR_REPOSITORY
```

5. ادفع التغييرات إلى `main`، وسيعمل الملف:

```text
.github/workflows/deploy.yml
```

## إعدادات خارجية تحتاج تدخلاً يدوياً

- إنشاء مشروع Supabase.
- تشغيل Migration SQL.
- تفعيل Phone Auth.
- ربط مزوّد SMS حقيقي.
- ضبط CAPTCHA وRate Limits للإنتاج.
- إضافة Redirect URLs.
- تعيين أول مدير عام بالسكربت المخصص.
- إضافة GitHub Secrets وVariable.
- تفعيل GitHub Pages من إعدادات المستودع.

## ما لم يُنفذ في هذه المرحلة

لم تُنشأ الطلبات أو الدفع أو الولاء أو السيارات أو المنيو أو الفروع أو واتساب أو محرر البطاقة. الواجهة لا تحاكيها ولا تعرض أرقاماً جاهزة لها. هذه المزايا تُنفذ في مراحلها مع جداولها وRLS ومنطقها الخلفي.

## أوامر التحقق

```bash
npm run typecheck
npm run build
npm run preview
```
