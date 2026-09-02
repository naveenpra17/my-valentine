# Creates the standard asset folder layout for a new site slug.
param(
  [Parameter(Mandatory = $true)]
  [string]$Slug
)

$root = Join-Path $PSScriptRoot "..\frontend\src\assets\sites\$Slug"
$folders = @("hero", "gallery", "memories", "audio")

foreach ($folder in $folders) {
  $path = Join-Path $root $folder
  New-Item -ItemType Directory -Force -Path $path | Out-Null
  $keep = Join-Path $path ".gitkeep"
  if (-not (Test-Path $keep)) { New-Item -ItemType File -Path $keep | Out-Null }
}

Write-Host "Created asset folders under frontend/src/assets/sites/$Slug"
Write-Host "Add hero/hero.jpg, gallery/photo-*.jpg, memories/memory-*.jpg, audio/background.mp3"
Write-Host "Then set Neon paths to /assets/sites/$Slug/..."
