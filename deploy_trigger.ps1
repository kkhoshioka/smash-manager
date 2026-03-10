$ErrorActionPreference = "Stop"
$env:Path = "C:\Program Files\Git\cmd;" + $env:Path

Write-Host "Triggering Vercel Deployment via Git Push..."
git commit -a --allow-empty -m "Trigger auto-deploy for UI refinements"
git push
Write-Host "Git push successful."
