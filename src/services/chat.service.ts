// Google Chat API - 카드 발송 서비스

export async function sendChatMessage(spaceId: string, message: object): Promise<void> {
  // TODO: Google Chat API를 통한 메시지/카드 발송
  console.log(`[ChatService] Sending message to space: ${spaceId}`);
}

export async function sendBriefingCard(spaceId: string, briefingData: object): Promise<void> {
  // TODO: 브리핑 카드 포맷 생성 및 발송
  console.log(`[ChatService] Sending briefing card to space: ${spaceId}`);
}
