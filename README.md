# 사용량 위젯 for Claude Code (비공식)

Claude Code 사용량(세션 5시간 · 주간 · 모델별 · 추가 크레딧)을 바탕화면에 띄워 두는 작은 위젯이에요.
맥과 윈도우에서 쓸 수 있어요.

> **비공식 프로젝트예요.** Anthropic과 관련이 없고, Anthropic이 만들거나 후원·보증한 앱이 아니에요.
> "Claude"와 "Claude Code"는 Anthropic의 상표예요. 이 위젯은 Claude Code의 `/usage` 화면이 쓰는
> 공개되지 않은 주소를 읽어 와서, Anthropic이 형식을 바꾸거나 막으면 언제든 동작을 멈출 수 있어요.
>
> 공식 설치 링크는 이 README의 명령뿐이에요. 다른 곳에서 받은 설치 파일·스크립트는 실행하지 마세요.

## 설치

**Claude Code에 로그인**돼 있어야 해요(터미널에서 `claude`를 한 번 실행해 로그인).

### 맥 (Apple Silicon, macOS 13 이상)

터미널에 붙여 넣으세요.

```
curl -fsSL https://raw.githubusercontent.com/bmarketer/claude-usage-widget/main/install.sh | bash
```

처음 실행할 때 키체인 접근을 물으면 **"항상 허용"** 을 눌러 주세요(Claude Code 로그인 정보를 읽기 위해서예요).

### 윈도우 (10·11, 64비트)

PowerShell에 붙여 넣으세요.

```
irm https://raw.githubusercontent.com/bmarketer/claude-usage-widget/main/install.ps1 | iex
```

직접 받으려면 [Releases](../../releases/latest)에서 `ClaudeUsageWidget-win-x64.exe`를 받아 실행하세요.
"Windows의 PC 보호" 창이 뜨면 **추가 정보 → 실행** 을 누르면 돼요(서명하지 않은 개인 프로젝트라 떠요).

## 사용법

- 메뉴바(맥) · 트레이(윈도우) 아이콘: 클릭하면 보이기/숨기기, 우클릭하면 크기·자동 시작·종료 메뉴
- 맥은 메뉴바 아이콘 옆에 세션 %가 떠요(85% 이상이면 `91%!`). 우클릭 메뉴에서 끌 수 있어요.
- **크기 조절**: 오른쪽 아래 모서리를 끌거나, ⌘(Ctrl) `−` `+` `0`. 0.8~1.4배.
- **자세히**: 아래 띠의 "자세히"로 모든 지표를 펼쳐요. 핀 버튼은 항상 위 고정.
- 한도가 **90%·95%·100%** 에 닿으면 리셋 구간마다 한 번씩만 알려줘요(맥은 화면 오른쪽 위 배너, 윈도우는 알림).

## 내 정보는 안전한가요?

- 로그인 토큰은 내 컴퓨터(맥 키체인 · 윈도우 `%USERPROFILE%\.claude`)에서 읽어
  **Anthropic 서버(`api.anthropic.com`)로만** 보내요. 다른 곳으로 보내거나 따로 저장하지 않아요.
- 위젯이 통신하는 곳은 두 군데뿐이에요.
  - `api.anthropic.com`: 2분마다 사용량 조회(위젯 이름을 밝힌 `User-Agent`로, 거절되면 간격을 늘려요)
  - `api.github.com`: 하루 한 번 새 버전이 있는지 확인(사용자 정보 없이 버전 번호만)
- 사용 기록·통계를 수집하지 않아요. 소스가 모두 공개돼 있어요(`src/main/usage.js`, `src/main/token.js`).
- 설치 스크립트는 내려받은 파일을 Release의 체크섬(`SHA256SUMS.txt`)과 대조해요.

## 업데이트 · 삭제

- **업데이트**: 설치 명령을 다시 실행하면 돼요.
- **삭제(맥)**: `curl -fsSL https://raw.githubusercontent.com/bmarketer/claude-usage-widget/main/install.sh | bash -s -- --uninstall`
- **삭제(윈도우)**: 설정 → 앱 → 설치된 앱 → "사용량" 제거

## 자주 묻는 것

- **"Claude Code 로그인이 필요해요"가 떠요** → 터미널에서 `claude`를 실행해 로그인하고 위젯의 "다시 확인"을 눌러 주세요.
- **"로그인이 만료됐어요"** → Claude Code를 한 번 실행하면 갱신돼요. 위젯은 토큰을 직접 갱신하지 않아요.
- **인텔 맥은요?** 지금은 Apple Silicon(M1 이상)만 지원해요.

## 개발

```
npm install && npm test   # 순수 로직 테스트
npm start                 # 위젯 실행
npm run dist:mac          # 맥: dist/mac/사용량.app (순정 Electron 복사 방식)
npm run dist:win          # 윈도우: electron-builder NSIS (윈도우에서 실행)
# 배포: package.json 버전을 올리고 git tag vX.Y.Z && git push --tags → Actions가 맥·윈도우 빌드 후 Release 생성
```

라이선스: MIT (Pretendard 글꼴은 SIL OFL 1.1)
