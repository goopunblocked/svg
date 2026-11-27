$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/zaka13alt/nosw/40f49f80245cf11610089b6dc3a74e29b8273bfd/single.html" -OutFile "nosw.html"
if (-not (Select-String -Path nosw.html -Pattern "openW1I41" -Quiet)) { throw "Upstream loader changed; review before upload." }
$loader = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'nosw.html')).Replace('nosw@main/', 'nosw@40f49f80245cf11610089b6dc3a74e29b8273bfd/')
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'nosw.html'), $loader)
Write-Host "Downloaded nosw.html. Upload it with the four Goop site files."
