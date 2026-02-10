# 🐹 Hamster Toothpick Duel

이쑤시개를 든 햄스터들의 대결 게임! 이제 온라인으로도 즐기세요!

## 🎮 게임 방법

### 로컬 모드 (오프라인)
- **1P**: WASD (이동) + Left Shift (공격)
- **2P**: 방향키 (이동) + Right Shift (공격)
- **R**: 재시작

### 온라인 모드
- **양쪽 모두 WASD + Left Shift 사용**
- 호스트: Player 1 (왼쪽 햄스터) 조종
- 게스트: Player 2 (오른쪽 햄스터) 조종
- **R**: 게임 종료 후에만 재시작 가능 (양쪽 동기화)

## 🎯 게임 룰

- 이쑤시개를 **길게 누르면** 더 강력하게 발사됩니다
- 너무 오래 누르면(4초 이상) **과충전 폭발**로 자멸!
- 이쑤시개는 벽에 **튕깁니다**
- 상대를 맞추면 승리!

## 🚀 실행 방법

### 로컬 실행
```bash
# Python 3
python3 -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

그 다음 브라우저에서 `http://localhost:8000` 접속

### Vercel 배포
```bash
# Vercel CLI 설치 (처음 한 번만)
npm install -g vercel

# 배포
vercel
```

## 🌐 온라인 플레이 작동 방식

- **기술**: PeerJS (WebRTC P2P)
- **서버 비용**: 완전 무료 (P2P 직접 연결)
- **레이턴시**: 10-50ms (플레이어 간 직접 연결)
- **방화벽**: 대부분의 환경에서 작동 (STUN 사용)

## 📁 프로젝트 구조

```
HamsterToothpickDuel/
├── index.html      # 메인 페이지 + 메뉴
├── game.js         # 게임 로직
├── network.js      # P2P 네트워크 관리
├── style.css       # 스타일
└── assets/         # 리소스 (BGM 등)
```

## 🛠️ 기술 스택

- **렌더링**: PixiJS v8
- **애니메이션**: GSAP v3
- **네트워킹**: PeerJS v1.5 (WebRTC)
- **호스팅**: Vercel (정적 호스팅)

## 📝 라이선스

MIT License
