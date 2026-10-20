$ErrorActionPreference = 'Stop'
$server = Join-Path $PSScriptRoot 'wordforge-server.cjs'
$pidFile = Join-Path $PSScriptRoot '.wordforge-server.pid'
if (-not (Test-Path -LiteralPath $pidFile)) { Write-Output 'WordForge is not running.'; exit 0 }
$serverPid = [int](Get-Content -LiteralPath $pidFile -Raw).Trim()
$process = Get-CimInstance Win32_Process -Filter "ProcessId = $serverPid"
if ($process -and $process.Name -eq 'node.exe' -and $process.CommandLine -and $process.CommandLine.Contains($server)) {
    Stop-Process -Id $serverPid
    Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
    Write-Output 'WordForge stopped. Your browser learning data is unchanged.'
} elseif (-not $process) {
    Remove-Item -LiteralPath $pidFile -Force
    Write-Output 'WordForge was already stopped.'
} else {
    throw 'PID belongs to another process; it was not stopped.'
}
