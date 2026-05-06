#requires -Version 5.1
<#
.SYNOPSIS
    Deploy automatico su VM produzione (62.238.14.85).

.DESCRIPTION
    Push del branch corrente, SSH al server, pull, build smart in base
    ai file cambiati, restart del service systemd `picsnails` se serve.

.PARAMETER SkipPush
    Salta il git push iniziale (utile se hai gia pushato manualmente).

.PARAMETER ForceBuild
    Forza rebuild del frontend e restart del service anche se i diff non
    lo richiederebbero.

.PARAMETER NoLog
    Non stampa il tail di journalctl alla fine.

.EXAMPLE
    .\scripts\deploy.ps1
    .\scripts\deploy.ps1 -SkipPush
    .\scripts\deploy.ps1 -ForceBuild
#>
[CmdletBinding()]
param(
    [switch]$SkipPush,
    [switch]$ForceBuild,
    [switch]$NoLog
)

$ErrorActionPreference = 'Stop'

# === Config ===
$ServerHost = 'root@62.238.14.85'
$KeyFile    = Join-Path $env:USERPROFILE '.ssh\oracle_picsnails'
$AppPath    = '/opt/picsnails/app'
$Service    = 'picsnails'
$Branch     = 'main'

# === Helpers ===
function Write-Step {
    param([string]$Label, [string]$Msg)
    Write-Host "[$Label] " -NoNewline -ForegroundColor Cyan
    Write-Host $Msg
}
function Write-Ok   { param([string]$Msg) Write-Host "  $Msg" -ForegroundColor Green }
function Write-Warn { param([string]$Msg) Write-Host "  $Msg" -ForegroundColor Yellow }

function Invoke-Ssh {
    param([Parameter(Mandatory)][string]$Cmd)
    $out = & ssh -i $KeyFile -o BatchMode=yes -o ConnectTimeout=15 -o StrictHostKeyChecking=accept-new $ServerHost $Cmd 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host $out -ForegroundColor Red
        throw "SSH fallito (exit=$LASTEXITCODE): $Cmd"
    }
    return $out
}

# === Sanity check ===
if (-not (Test-Path $KeyFile)) {
    throw "Chiave SSH non trovata: $KeyFile"
}

# === 1. Push locale ===
if (-not $SkipPush) {
    Write-Step '1/5' 'git push origin main'
    & git push origin $Branch
    if ($LASTEXITCODE -ne 0) { throw 'git push fallito' }
} else {
    Write-Step '1/5' 'git push saltato (-SkipPush)'
}

# === 2. SHA pre-pull ===
Write-Step '2/5' 'Snapshot stato server'
$oldSha = (Invoke-Ssh "cd $AppPath && git rev-parse HEAD").Trim()
Write-Ok "pre-pull: $oldSha"

# === 3. Pull ===
Write-Step '3/5' 'git pull --ff-only sul server'
$pullOut = Invoke-Ssh "cd $AppPath && git pull --ff-only origin $Branch 2>&1"
$newSha  = (Invoke-Ssh "cd $AppPath && git rev-parse HEAD").Trim()
Write-Ok "post-pull: $newSha"

if ($oldSha -eq $newSha -and -not $ForceBuild) {
    Write-Warn 'Nessun nuovo commit, deploy non necessario.'
    exit 0
}

# === 4. Diff + build ===
Write-Step '4/5' 'Analisi modifiche'
$changedRaw = if ($oldSha -ne $newSha) {
    Invoke-Ssh "cd $AppPath && git diff --name-only $oldSha $newSha"
} else { '' }
$changed = $changedRaw -split "`n" | Where-Object { $_ -ne '' }

$backendChanged       = $false
$frontendChanged      = $false
$backendPkgChanged    = $false
$frontendPkgChanged   = $false
foreach ($f in $changed) {
    if ($f -like 'backend_v2/*')                                                { $backendChanged    = $true }
    if ($f -like 'frontend/*')                                                  { $frontendChanged   = $true }
    if ($f -eq 'backend_v2/package.json' -or $f -eq 'backend_v2/package-lock.json')   { $backendPkgChanged  = $true }
    if ($f -eq 'frontend/package.json'   -or $f -eq 'frontend/package-lock.json')     { $frontendPkgChanged = $true }
}

if ($changed.Count -gt 0) {
    Write-Ok "$($changed.Count) file modificati"
    if ($backendChanged)     { Write-Ok '  backend toccato'  }
    if ($frontendChanged)    { Write-Ok '  frontend toccato' }
    if ($backendPkgChanged)  { Write-Warn '  backend package.json cambiato → npm install backend' }
    if ($frontendPkgChanged) { Write-Warn '  frontend package.json cambiato → npm install frontend' }
}

if ($backendPkgChanged) {
    Write-Step '4/5' '  npm install (backend)'
    Invoke-Ssh "cd $AppPath/backend_v2 && npm install --omit=dev --no-audit --no-fund" | Out-Host
}

if ($frontendChanged -or $ForceBuild) {
    if ($frontendPkgChanged) {
        Write-Step '4/5' '  npm install (frontend)'
        Invoke-Ssh "cd $AppPath/frontend && npm install --no-audit --no-fund" | Out-Host
    }
    Write-Step '4/5' '  vite build (frontend)'
    Invoke-Ssh "cd $AppPath/frontend && npm run build" | Out-Host
}

# === 5. Restart se serve ===
$needsRestart = $backendChanged -or $ForceBuild
if ($needsRestart) {
    Write-Step '5/5' "Restart $Service"
    Invoke-Ssh "systemctl restart $Service && sleep 2 && systemctl is-active $Service" | Out-Host
    Write-Ok 'service attivo'
} else {
    Write-Step '5/5' 'Solo frontend modificato, nessun restart necessario'
}

# === Tail log ===
if (-not $NoLog) {
    Write-Host ''
    Write-Host '--- ultimi log picsnails ---' -ForegroundColor Cyan
    Invoke-Ssh "journalctl -u $Service -n 15 --no-pager" | Out-Host
}

Write-Host ''
Write-Host "Deploy OK: $oldSha -> $newSha" -ForegroundColor Green
