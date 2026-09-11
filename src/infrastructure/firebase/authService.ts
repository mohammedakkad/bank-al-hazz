import { signInAnonymously, onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from './firebaseConfig';

/**
 * قرار معماري: الاسم المستعار (nickname) لا يُحفظ على بروفايل Firebase Auth نفسه
 * (عبر updateProfile) لأن المستخدم المجهول (anonymous) ممكن يدخل بأسماء مختلفة
 * في غرف/جلسات مختلفة — الاسم مرتبط بكل لعبة على حدة، ويُخزَّن ضمن مستند اللاعب
 * (Player) داخل تلك الغرفة تحديداً في Firestore، وليس هنا. هذا الملف مسؤول فقط
 * عن الهوية (uid) الثابتة عبر الجلسات، وليس عن أي بيانات عرض.
 */

/**
 * يضمن وجود جلسة مصادقة مجهولة دون أي خطوة ظاهرة للمستخدم.
 * إذا كان هناك مستخدم مسجّل مسبقاً (Firebase Auth يحفظ الجلسة تلقائياً)، لا شيء يحدث.
 */
export async function ensureAnonymousSession(): Promise<void> {
  if (auth.currentUser) return;
  await signInAnonymously(auth);
}

/**
 * يستمع لتغيّر حالة المصادقة ويعيد دالة إلغاء الاشتراك.
 */
export function onAuthStateChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}
