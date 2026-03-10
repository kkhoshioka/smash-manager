$ErrorActionPreference = "Stop"
$env:Path = "C:\Program Files\nodejs;" + $env:Path

Write-Host "Running local build..."
npm run build
