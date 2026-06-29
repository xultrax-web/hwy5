param(
  [Parameter(Mandatory = $true)]
  [string]$ZipPath
)

$ErrorActionPreference = "Stop"

if (!(Test-Path -LiteralPath $ZipPath)) {
  throw "Zip not found: $ZipPath"
}

$root = "C:\Dev\hwy5\incoming-claude"
$zip = Get-Item -LiteralPath $ZipPath
$safeName = [IO.Path]::GetFileNameWithoutExtension($zip.Name) -replace '[^\w\.-]+', '-'
$extractDir = Join-Path $root "extracted\$safeName"
$inventoryPath = Join-Path $root "inventory\$safeName.md"

New-Item -ItemType Directory -Force -Path $extractDir | Out-Null
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $inventoryPath) | Out-Null

Expand-Archive -LiteralPath $zip.FullName -DestinationPath $extractDir -Force

$files = Get-ChildItem -LiteralPath $extractDir -Recurse -File
$entryCandidates = $files | Where-Object {
  $_.Name -match '^(package\.json|index\.html|vite\.config|next\.config|src|app)' -or
  $_.Extension -in '.html', '.js', '.jsx', '.ts', '.tsx'
} | Select-Object -First 40

$dependencyHits = @(
  "three",
  "babylon",
  "maplibre",
  "deck.gl",
  "cesium",
  "rapier",
  "leaflet",
  "react",
  "vite"
)

$hitLines = foreach ($hit in $dependencyHits) {
  $matches = $files |
    Where-Object { $_.Extension -in '.json', '.js', '.jsx', '.ts', '.tsx', '.html', '.css' } |
    Select-String -Pattern $hit -SimpleMatch -List -ErrorAction SilentlyContinue |
    Select-Object -First 8
  if ($matches) {
    "- ${hit}: found in " + (($matches | ForEach-Object { $_.Path.Replace($extractDir, "").TrimStart("\") }) -join ", ")
  } else {
    "- ${hit}: not found"
  }
}

$largeFiles = $files | Where-Object { $_.Length -gt 5MB } | Sort-Object Length -Descending | Select-Object -First 20

$content = @()
$content += "# Claude Zip Inventory - $($zip.Name)"
$content += ""
$content += "- Extracted to: ``$extractDir``"
$content += "- File count: $($files.Count)"
$content += "- Total size MB: $([Math]::Round((($files | Measure-Object Length -Sum).Sum / 1MB), 2))"
$content += ""
$content += "## Entry Candidates"
$content += ""
$content += ($entryCandidates | ForEach-Object { "- " + $_.FullName.Replace($extractDir, "").TrimStart("\") })
$content += ""
$content += "## Dependency Clues"
$content += ""
$content += $hitLines
$content += ""
$content += "## Large Files"
$content += ""
if ($largeFiles) {
  $content += ($largeFiles | ForEach-Object { "- $([Math]::Round($_.Length / 1MB, 2)) MB - " + $_.FullName.Replace($extractDir, "").TrimStart("\") })
} else {
  $content += "- none over 5 MB"
}
$content += ""
$content += "## Integration Notes"
$content += ""
$content += "- Treat this as rendering/control donor material."
$content += "- Do not promote duplicate dashboard shells."
$content += "- Wire one adapter at a time: first-person, drone, overhead."
$content += "- Keep Glympse in Live Source only."
$content += "- Keep traffic overhead-only."

Set-Content -LiteralPath $inventoryPath -Value ($content -join "`r`n") -Encoding UTF8
Write-Output $inventoryPath
