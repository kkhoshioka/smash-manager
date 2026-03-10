$ErrorActionPreference = "Stop"
$env:Path = "C:\Program Files\Git\cmd;" + $env:Path

Write-Host "Triggering Vercel Deployment via Git Push..."
git add src/components/MatchLogger.jsx
git commit -m "style(logger): lower dynamic streak threshold from 3 to 2"
git push
Write-Host "Git push successful."
