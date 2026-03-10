$ErrorActionPreference = "Stop"
$env:Path = "C:\Program Files\Git\cmd;" + $env:Path

Write-Host "Triggering Vercel Deployment via Git Push..."
git add src/components/Settings.jsx
git add public/bg_symbol_blue.png
git add public/bg_symbol_gold.png
git add public/bg_symbol_glitch.png
git add public/bg_symbol_stealth.png
git add public/bg_symbol_fire.png

git commit -m "feat(ui): add 5 new Smash symbol background variations"
git push
Write-Host "Git push successful."
