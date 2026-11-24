# 사용량 위젯 (비공식) — 윈도우 설치·업데이트
#   irm https://raw.githubusercontent.com/bmarketer/claude-usage-widget/main/install.ps1 | iex
#
# PowerShell로 받은 파일에는 "인터넷에서 받은 파일" 표시가 붙지 않아 SmartScreen 경고 없이 설치된다.
# 내려받은 설치 파일은 Release의 SHA256SUMS.txt와 대조해 손상·변조 여부를 확인한다.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$Repo = 'bmarketer/claude-usage-widget'
$Exe = 'ClaudeUsageWidget-win-x64.exe'
$Base = if ($env:CUW_BASE_URL) { $env:CUW_BASE_URL } else { "https://github.com/$Repo/releases/latest/download" }
$Tmp = Join-Path $env:TEMP ('cuw-' + [guid]::NewGuid())
New-Item -ItemType Directory -Path $Tmp | Out-Null

try {
  Write-Host '사용량 위젯(비공식)을 내려받는 중이에요...'
  $ExePath = Join-Path $Tmp $Exe
  $SumsPath = Join-Path $Tmp 'SHA256SUMS.txt'
  Invoke-WebRequest -UseBasicParsing -Uri "$Base/$Exe" -OutFile $ExePath
  Invoke-WebRequest -UseBasicParsing -Uri "$Base/SHA256SUMS.txt" -OutFile $SumsPath

  $line = Get-Content $SumsPath | Where-Object { $_ -match [regex]::Escape($Exe) } | Select-Object -First 1
  if (-not $line) { throw '체크섬 목록에서 설치 파일을 찾지 못했어요.' }
  $expected = ($line -split '\s+')[0].ToLower()
  $actual = (Get-FileHash -Algorithm SHA256 -Path $ExePath).Hash.ToLower()
  if ($actual -ne $expected) { throw '내려받은 파일이 손상됐어요(체크섬 불일치). 잠시 뒤 다시 시도해 주세요.' }

  # 업데이트라면 실행 중인 위젯을 먼저 닫는다
  Get-Process -Name '사용량' -ErrorAction SilentlyContinue | Stop-Process -Force
  Start-Sleep -Milliseconds 500

  Write-Host '설치하는 중이에요...'
  Start-Process -FilePath $ExePath -ArgumentList '/S', '--force-run' -Wait
  Write-Host ''
  Write-Host '설치 완료! 작업표시줄 오른쪽 트레이(^)에 사용량 아이콘이 생겨요.'
  Write-Host 'Claude Code에 로그인돼 있어야 사용량이 보여요.'
}
catch {
  Write-Host ''
  Write-Host "설치하지 못했어요: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "직접 받기: https://github.com/$Repo/releases/latest"
}
finally {
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $Tmp
}
