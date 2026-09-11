import { HashRouter, Routes, Route } from 'react-router-dom';
import { EntryScreen } from './screens/EntryScreen';
import { LobbyRoomScreen } from './screens/LobbyRoomScreen';
import { GameScreen } from './screens/GameScreen';

/**
 * قرار: HashRouter وليس BrowserRouter.
 * GitHub Pages استضافة static بدون rewrite للسيرفر، فأي تحديث للصفحة على
 * مسار مثل /lobby/ABC123 مباشرة (وليس عبر تنقل داخل الـSPA) بيرجع 404 حقيقي
 * من GitHub Pages. HashRouter (#/lobby/ABC123) يتجنب هذه المشكلة تماماً بدون
 * أي إعداد إضافي (مثل حيلة 404.html). ثمن ذلك روابط أقل أناقة (# بالرابط) —
 * قرار معماري يستحق المراجعة لاحقاً لو صار مطلوب روابط نظيفة.
 */
export function AppRoutes() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<EntryScreen />} />
        <Route path="/lobby/:roomId" element={<LobbyRoomScreen />} />
        <Route path="/game/:roomId" element={<GameScreen />} />
      </Routes>
    </HashRouter>
  );
}
