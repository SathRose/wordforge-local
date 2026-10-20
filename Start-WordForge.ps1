param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$base = $PSScriptRoot
$url = 'http://127.0.0.1:8765/'
$healthUrl = $url + '__wordforge/health'

function Get-WordForgeHealth {
    try {
        $h = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 2
        if ($h.app -eq 'wordforge-local') { return $h }
    } catch {}
    return $null
}

if (-not (Test-Path -LiteralPath (Join-Path $base 'wordforge.html'))) {
    throw 'wordforge.html is missing. Restore the application HTML first.'
}
if (-not (Get-WordForgeHealth)) {
    $node = (Get-Command node -ErrorAction Stop).Source
    $server = Join-Path $base 'wordforge-server.cjs'
    Start-Process -FilePath $node -ArgumentList ('"' + $server + '"') -WorkingDirectory $base -WindowStyle Hidden -RedirectStandardOutput (Join-Path $base 'wordforge-server.log') -RedirectStandardError (Join-Path $base 'wordforge-server.error.log') | Out-Null
    $ready = $false
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Milliseconds 300
        if (Get-WordForgeHealth) { $ready = $true; break }
    }
    if (-not $ready) { throw 'Could not start WordForge. Check wordforge-server.error.log; port 8765 may already be in use.' }
}
Write-Output ('WordForge is running: ' + $url)
if (-not $NoBrowser) { Start-Process $url }
