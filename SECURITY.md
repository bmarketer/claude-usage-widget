# 보안 문제 알리기

보안 문제(설치 스크립트·릴리스 파일 변조 의심, 토큰 노출 가능성 등)를 찾으면 **공개 이슈 말고**
GitHub의 [비공개 보안 신고](../../security/advisories/new)로 알려 주세요.

- 개인이 운영하는 비공식 프로젝트라 답변이 며칠 걸릴 수 있어요.
- 확인한 문제는 고친 버전을 낸 뒤 공개해요.

## 받은 파일이 진짜인지 확인하기

공식 파일은 이 레포의 [Releases](../../releases)에만 올라가요. 각 릴리스의 `SHA256SUMS.txt`와 대조하세요.

- 맥: `shasum -a 256 ClaudeUsageWidget-mac-arm64.zip`
- 윈도우(PowerShell): `Get-FileHash ClaudeUsageWidget-win-x64.exe -Algorithm SHA256`

설치 명령(`install.sh`, `install.ps1`)은 이 확인을 자동으로 해요.
