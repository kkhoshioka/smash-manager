$ErrorActionPreference = "Stop"
$env:Path = "C:\Program Files\Git\cmd;" + $env:Path

Write-Host "Triggering Vercel Deployment via Git Push..."
git add src/components/MatchLogger.jsx
git commit -m "feat(logger): add matchup stats display"
git push
Write-Host "Git push successful."
