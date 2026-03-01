// Firestore 클라이언트 - 토큰/설정 저장

export async function getUserTokens(userId: string): Promise<object | null> {
  // TODO: Firestore에서 사용자 OAuth 토큰 조회
  console.log(`[Firestore] Getting tokens for user: ${userId}`);
  return null;
}

export async function saveUserTokens(userId: string, tokens: object): Promise<void> {
  // TODO: Firestore에 사용자 OAuth 토큰 저장
  console.log(`[Firestore] Saving tokens for user: ${userId}`);
}

export async function getUserSettings(userId: string): Promise<object | null> {
  // TODO: Firestore에서 사용자 설정 조회 (브리핑 시간 등)
  console.log(`[Firestore] Getting settings for user: ${userId}`);
  return null;
}
