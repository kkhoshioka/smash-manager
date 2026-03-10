$ErrorActionPreference = "Stop"
$env:Path = "C:\Program Files\Git\cmd;" + $env:Path

Write-Host "Committing changes to Git..."
git add public/bg_stage.png src/index.css
git commit -m "Fix background image: Use high-quality generated local image to bypass hotlinking restrictions"
git push
Write-Host "Git push successful."
