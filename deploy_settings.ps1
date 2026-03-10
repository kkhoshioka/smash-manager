$ErrorActionPreference = "Stop"
$env:Path = "C:\Program Files\Git\cmd;" + $env:Path

Write-Host "Triggering Vercel Deployment via Git Push..."
git add src/App.jsx
git add src/components/Settings.jsx
git add src/components/Stats.jsx
git add src/index.css
git add public/bg_neon.png
git add public/bg_calm.png
git add public/bg_fiery.png
git add public/bg_carbon.png

git commit -m "feat(ui): add Settings tab, dynamic backgrounds, and user customization"
git push
Write-Host "Git push successful."
