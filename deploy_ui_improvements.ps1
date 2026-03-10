$ErrorActionPreference = "Stop"
$env:Path = "C:\Program Files\Git\cmd;" + $env:Path

Write-Host "Triggering Vercel Deployment via Git Push..."
git add src/components/MatchLogger.jsx
git add src/components/Stats.jsx
git commit -m "feat(ui): add dynamic win streak badge and 'show all' matchups toggle"
git push
Write-Host "Git push successful."
