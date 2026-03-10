$ErrorActionPreference = "Stop"
$env:Path = "C:\Program Files\Git\cmd;" + $env:Path

Write-Host "Triggering Vercel Deployment via Git Push..."
git add src/data/fighters.js
git commit -m "feat(data): add Magic Burst and Kaswoosh to Hero's kill moves"
git push
Write-Host "Git push successful."
