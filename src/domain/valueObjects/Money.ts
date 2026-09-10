/**
 * Money — Value Object
 *
 * لماذا Value Object وليس رقم عادي (number)؟
 * - يمنع أخطاء مثل جمع مبلغ بعملة مختلفة أو قيمة سالبة غير مقصودة
 * - كل عمليات المال (دفع إيجار، شراء، غرامة) تمر من هنا فقط → مصدر واحد للحقيقة
 * - immutable: كل عملية تُرجع Money جديد بدل تعديل القيمة الأصلية، يمنع side effects
 */
export class Money {
  private constructor(private readonly amount: number) {
    if (!Number.isFinite(amount)) {
      throw new Error('Money: amount must be a finite number');
    }
  }

  static of(amount: number): Money {
    return new Money(Math.round(amount));
  }

  static zero(): Money {
    return new Money(0);
  }

  get value(): number {
    return this.amount;
  }

  add(other: Money): Money {
    return new Money(this.amount + other.amount);
  }

  subtract(other: Money): Money {
    return new Money(this.amount - other.amount);
  }

  isNegative(): boolean {
    return this.amount < 0;
  }

  isGreaterThanOrEqual(other: Money): boolean {
    return this.amount >= other.amount;
  }

  format(): string {
    return `${this.amount.toLocaleString('ar-EG')} جنيه`;
  }
}
