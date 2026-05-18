# 가계부 자동화 - Windows 작업 스케줄러 등록
# PowerShell을 관리자 권한으로 실행 후 이 스크립트를 실행하세요

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pythonScript = Join-Path $scriptDir "kakao_updater.py"
$taskName = "가계부_자동업데이트"
$logFile = Join-Path $scriptDir "scheduler.log"

# Python 경로 자동 탐지
$pythonPath = (Get-Command python -ErrorAction SilentlyContinue).Source
if (-not $pythonPath) {
    Write-Host "Python을 찾을 수 없습니다. Python이 설치되어 있는지 확인하세요." -ForegroundColor Red
    exit 1
}
Write-Host "Python 경로: $pythonPath" -ForegroundColor Cyan

# 기존 작업 삭제 후 재등록
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "기존 작업 삭제됨" -ForegroundColor Yellow
}

# 매일 오전 9시 실행 트리거
$trigger = New-ScheduledTaskTrigger -Daily -At "09:00"

# 실행 동작: python kakao_updater.py
$action = New-ScheduledTaskAction `
    -Execute $pythonPath `
    -Argument "`"$pythonScript`"" `
    -WorkingDirectory $scriptDir

# 설정: 잠금화면에서도 실행, 이미 실행 중이면 건너뜀
$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 10) `
    -MultipleInstances IgnoreNew `
    -StartWhenAvailable

# 현재 사용자로 로그온 시 실행
$principal = New-ScheduledTaskPrincipal `
    -UserId $env:USERNAME `
    -LogonType Interactive `
    -RunLevel Highest

Register-ScheduledTask `
    -TaskName $taskName `
    -Trigger $trigger `
    -Action $action `
    -Settings $settings `
    -Principal $principal `
    -Description "카카오톡 나에게 보내기 메시지를 읽어 가계부를 자동 업데이트합니다." | Out-Null

Write-Host ""
Write-Host "✅ 작업 스케줄러 등록 완료!" -ForegroundColor Green
Write-Host "   작업명: $taskName" -ForegroundColor White
Write-Host "   실행 시간: 매일 오전 9:00" -ForegroundColor White
Write-Host "   스크립트: $pythonScript" -ForegroundColor White
Write-Host ""
Write-Host "지금 바로 테스트 실행하려면 아래 명령어를 입력하세요:" -ForegroundColor Cyan
Write-Host "   Start-ScheduledTask -TaskName '$taskName'" -ForegroundColor Yellow
