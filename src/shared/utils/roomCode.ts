const ROOM_CODE_LENGTH = 6;
// بدون: 0/O و 1/I/L لتجنب التباس اللاعبين لما يكتبوا الكود يدوياً
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateRoomCode(randomFn: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    const index = Math.floor(randomFn() * ROOM_CODE_ALPHABET.length);
    code += ROOM_CODE_ALPHABET[index];
  }
  return code;
}

export function normalizeRoomCode(rawValue: string): string {
  return rawValue.trim().toUpperCase();
}
