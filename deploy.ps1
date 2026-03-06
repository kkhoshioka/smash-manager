$ErrorActionPreference = "Stop"
$env:Path = "C:\Program Files\nodejs;C:\Program Files\Git\cmd;" + $env:Path

Write-Host "Committing changes to Git..."
git add .
git commit -m "Update UI: Add official Final Destination background, fix walkthrough, and improve panels"
git push

Write-Host "Deploying to Vercel production..."
npx vercel --prod --yes
