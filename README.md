# Ping Universe

Google Chat Bot — Jira / Gmail 연동 알림 및 브리핑 서비스

## 아키텍처

```
[로컬 개발] → [GitHub main] → [prd 머지] → [GitHub Actions] → [맥미니 PM2 배포]
```

## 기능

- **온보딩**: Google Chat DM → Jira/Gmail OAuth 연동
- **아침 브리핑**: 스케줄 기반 Jira 이슈 + Gmail 읽지 않은 메일 요약
- **Jira 실시간 알림**: Webhook → Google Chat 카드
- **Gmail 실시간 알림**: Pub/Sub → 메일 필터링/요약 → 카드

## 개발

```bash
# 의존성 설치
npm install

# 개발 서버 (hot reload)
npm run dev

# 빌드
npm run build

# 프로덕션 실행
npm start
```

## 배포

`prd` 브랜치에 머지 시 GitHub Actions가 맥미니 Self-hosted Runner에서 자동 배포합니다.

```bash
# 수동 배포 (맥미니에서)
git pull origin prd
npm ci
npm run build
pm2 restart ecosystem.config.js
```

## 브랜치 전략

| 브랜치 | 용도 |
|--------|------|
| `main` | 개발 안정선 |
| `feature/*` | 기능 개발 |
| `fix/*` | 버그 수정 |
| `hotfix/*` | 긴급 수정 |
| `prd` | 운영 배포 |

## 태그

Semantic Versioning: `v메이저.마이너.패치` (예: `v1.0.0`)

## 환경 변수

`.env.example` 참고
