$ErrorActionPreference = "Stop"
$env:Path = "C:\Program Files\Git\cmd;" + $env:Path

Write-Host "Triggering Vercel Deployment via Git Push..."
git add src/components/Stats.jsx
git commit -m "feat(ui): add comprehensive Stats analytics including daily stats and streaks"
git push
Write-Host "Git push successful."
