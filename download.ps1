$ErrorActionPreference = "Stop"
$headers = @{
    "Referer"    = "https://www.ssbwiki.com/"
    "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    "Accept"     = "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
}
Write-Host "Downloading background image..."
Invoke-WebRequest -Uri "https://ssb.wiki.gallery/images/8/87/FDdark.png" -OutFile "public\bg_stage.png" -Headers $headers
Write-Host "Download complete."
