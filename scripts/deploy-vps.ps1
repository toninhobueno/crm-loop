# Deploy deste único repo (backend + pasta crm-loop-frontend/).
# Uso: .\scripts\deploy-vps.ps1 -SshHost "IP" -ReactBackendUrl "https://api..."

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string] $SshHost,

    [Parameter(Mandatory = $false)]
    [string] $SshUser = "root",

    [Parameter(Mandatory = $true)]
    [string] $ReactBackendUrl,

    [Parameter(Mandatory = $false)]
    [string] $RemotePath = "/opt/crm-loop-backend",

    [Parameter(Mandatory = $false)]
    [string] $IdentityFile = ""
)

$ErrorActionPreference = "Stop"

$ssh = "C:\Windows\System32\OpenSSH\ssh.exe"
$scp = "C:\Windows\System32\OpenSSH\scp.exe"
if (-not (Test-Path $ssh)) { throw "OpenSSH não encontrado em $ssh" }

$dir = Resolve-Path (Join-Path $PSScriptRoot "..")
$repoRoot = $null
while ($dir) {
    $d = $dir.Path
    if ((Test-Path (Join-Path $d "docker-compose.yml")) -and (Test-Path (Join-Path $d "crm-loop-frontend/package.json")) -and (Test-Path (Join-Path $d "docker/Dockerfile.backend"))) {
        $repoRoot = $d
        break
    }
    $parent = Split-Path $d -Parent
    if ($parent -eq $d) { break }
    $dir = Get-Item $parent
}
if ($null -eq $repoRoot) { throw "Coloca-te no repo backend com crm-loop-frontend/ e docker-compose.yml na raiz." }

$archive = Join-Path ([System.IO.Path]::GetTempPath()) ("crm-deploy-" + [Guid]::NewGuid().ToString("N") + ".tgz")
$sshTarget = "${SshUser}@${SshHost}"
$sshBase = @()
if ($IdentityFile -ne "") {
    if (-not (Test-Path $IdentityFile)) { throw "Chave SSH não encontrada: $IdentityFile" }
    $sshBase += "-i", $IdentityFile
}

Write-Host "Repo: $repoRoot"
Push-Location $repoRoot
try {
    & tar "-czf" $archive `
        "--exclude=node_modules" `
        "--exclude=crm-loop-frontend/node_modules" `
        "--exclude=dist" `
        "--exclude=crm-loop-frontend/build" `
        "--exclude=.git" `
        "--exclude=.env" `
        "--exclude=crm-loop-frontend/.env" `
        .
    if ($LASTEXITCODE -ne 0) { throw "tar falhou código $LASTEXITCODE" }
}
finally { Pop-Location }

try {
    & $scp @sshBase -o StrictHostKeyChecking=accept-new $archive "${sshTarget}:/tmp/crm-deploy.tgz"
    if ($LASTEXITCODE -ne 0) { throw "scp falhou." }

    $reactB64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($ReactBackendUrl))
    $bash = @"
set -e
export REACT_APP_BACKEND_URL=`$(echo '$reactB64' | base64 -d)
mkdir -p '$RemotePath'
tar -xzf /tmp/crm-deploy.tgz -C '$RemotePath'
rm -f /tmp/crm-deploy.tgz
cd '$RemotePath'
test -f .env || { echo 'ERRO: cria .env no servidor em $RemotePath'; exit 1; }
docker compose build
docker compose up -d
docker compose exec -T backend npx sequelize db:migrate
echo OK
"@

    & $ssh @sshBase -o StrictHostKeyChecking=accept-new $sshTarget $bash
    if ($LASTEXITCODE -ne 0) { throw "remoto falhou $LASTEXITCODE" }
}
finally {
    Remove-Item -Force $archive -ErrorAction SilentlyContinue
}
