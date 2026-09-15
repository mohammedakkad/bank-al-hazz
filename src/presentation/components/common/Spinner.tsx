export interface SpinnerProps {
  readonly className?: string;
}

/**
 * Item 1: لا يوجد أي نمط "spinner" جاهز بالمشروع فعلياً — تحقّقت من EntryScreen.tsx
 * (المرجع اللي طلبته المهمة) ووجدت إن كل ما يفعله وقت الإرسال هو تعطيل الزر
 * (`disabled`) مع تعتيمه (`opacity-50`)، بدون أي حركة/أيقونة تدوير. بما إنه ما
 * في نمط جاهز فعلياً نعيد استخدامه، هذا مكوّن صغير جديد بسيط (Tailwind فقط،
 * بدون أي مكتبة إضافية) بألوان المشروع الحالية — نقطة بداية لأي زر تحميل مستقبلي
 * بدل اختراع نمط مختلف بكل شاشة.
 */
export function Spinner({ className = 'h-4 w-4' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="جاري التحميل"
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}
