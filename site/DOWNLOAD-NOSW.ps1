$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/zaka13alt/nosw/main/single.html" -OutFile "nosw.html"
if (-not (Select-String -Path nosw.html -Pattern "openW1I41" -Quiet)) { throw "Upstream loader changed; review before upload." }
Write-Host "Downloaded nosw.html. Upload it with the four Goop site files."
