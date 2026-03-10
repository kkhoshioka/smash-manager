$ErrorActionPreference = "Stop"
$env:Path = "C:\Program Files\Git\cmd;" + $env:Path

Write-Host "Triggering Vercel Deployment via Git Push..."
git add src/components/Stats.jsx
git commit -m "feat(stats): increase top kill moves display limit to 10"
git push
Write-Host "Git push successful."
