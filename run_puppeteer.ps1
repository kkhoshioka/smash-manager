$ErrorActionPreference = "Stop"
$env:Path = "C:\Program Files\nodejs;" + $env:Path

Write-Host "Running download script..."
node download_puppeteer.js
