# Starts the SmartHerd server on port 8766, reachable from the network (phones, tunnel).
# Usage: .\start-server.ps1 [-Token <access code>]   (a random 12-character code is generated and printed when omitted)
param([string]$Token)
if (-not $Token) {
    $chars = 'abcdefghjkmnpqrstuvwxyz23456789'.ToCharArray()
    $bytes = New-Object byte[] 12
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $Token = -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] })
}
Write-Host "Access code: $Token"
$env:SMARTHERD_TOKEN = $Token
Push-Location (Join-Path $PSScriptRoot 'smartherd')
try { & (Join-Path $PSScriptRoot '.venv\Scripts\python.exe') cloud_mock.py 8766 --host 0.0.0.0 }
finally { Pop-Location }
