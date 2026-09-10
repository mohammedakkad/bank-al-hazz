# بنك الحظ — Bank Al-Hazz

لعبة لوحة أونلاين بأسلوب مونوبولي، بهوية عربية كاملة (مدن عربية، أعلام دول)، تدعم من 2 إلى 6 لاعبين عبر الإنترنت في الوقت الفعلي.

## الستاك التقني
- **Frontend**: React + TypeScript + Vite
- **التصميم**: Tailwind CSS (responsive بالكامل: هاتف / آيباد / ديسكتوب)
- **الأنيميشن**: Framer Motion
- **الباكيند**: Firebase (Firestore realtime + Anonymous Auth) — بدون سيرفر تقليدي
- **الاستضافة**: GitHub Pages (static build)

## المعمارية — Clean Architecture

```
src/
├── domain/          # قواعد اللعبة الصافية — TypeScript فقط، صفر اعتماد على React/Firebase
├── application/      # use cases: تنسيق قواعد الـdomain لتنفيذ عملية كاملة (رمي نرد + حركة مثلاً)
├── infrastructure/   # التنفيذ الفعلي: Firestore repositories, firebase config
├── presentation/     # React: components, screens, hooks, animations
└── shared/           # أدوات عامة، ثوابت، أنواع مشتركة
```

**لماذا هذا الفصل؟** قواعد اللعبة (حساب الإيجار، حركة اللاعب، الإفلاس) هي أهم جزء
في المشروع ويجب أن تكون قابلة للاختبار بمعزل تام عن الشبكة والواجهة. أي تغيير
مستقبلي في الباكيند (استبدال Firebase مثلاً) لن يمس منطق اللعبة إطلاقاً.

## التشغيل محلياً

```bash
npm install
cp .env.example .env.local   # واملأ بيانات مشروع Firebase الخاص بك
npm run dev
```

## الاختبارات

```bash
npm test
```

## النشر على GitHub Pages
1. فعّل GitHub Pages من إعدادات الـrepo → Source: GitHub Actions
2. أضف أسرار Firebase في Settings → Secrets and variables → Actions (بنفس أسماء
   المتغيرات في `.env.example`)
3. كل push على `main` ينشر تلقائياً عبر `.github/workflows/deploy.yml`
4. تأكد أن `base` في `vite.config.ts` يطابق اسم الـrepo بالضبط

## حالة المشروع
- [x] المرحلة 1: التخطيط والمعمارية
- [x] المرحلة 2: إعداد المشروع (Vite, TS, Tailwind, Firebase config)
- [x] المرحلة 3 (جزئي): طبقة الـdomain — لوحة 40 مربع، Player، Money، قواعد الحركة والنرد والإيجار
- [ ] المرحلة 4: مكونات الواجهة (اللوبي، اللوحة التفاعلية، شاشة اللاعب)
- [ ] المرحلة 5: ربط Firebase الفعلي للـmultiplayer
- [ ] المرحلة 6: تغطية اختبارات كاملة
- [ ] المرحلة 7: نشر production
