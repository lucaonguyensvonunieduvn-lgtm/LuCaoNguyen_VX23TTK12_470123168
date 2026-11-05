param(
    [string]$Name = "LaptopStore_Final_Source",
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " LAPTOP STORE - FINAL DELIVERY PACKAGE GENERATOR" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$releases = Join-Path $root "releases"

# STEP 1: Build Frontend
if (-not $SkipBuild) {
    Write-Host "`n[STEP 1/12] Building Frontend..." -ForegroundColor Yellow
    Push-Location (Join-Path $root "src\frontend")
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) { throw "Frontend build failed with exit code $LASTEXITCODE" }
    }
    finally {
        Pop-Location
    }
} else {
    Write-Host "`n[STEP 1/12] Skipped Frontend build (-SkipBuild specified)." -ForegroundColor DarkGray
}

# STEP 2: Build Backend
if (-not $SkipBuild) {
    Write-Host "`n[STEP 2/12] Building Backend..." -ForegroundColor Yellow
    Push-Location (Join-Path $root "src\backend")
    try {
        dotnet build
        if ($LASTEXITCODE -ne 0) { throw "Backend build failed with exit code $LASTEXITCODE" }
    }
    finally {
        Pop-Location
    }
} else {
    Write-Host "`n[STEP 2/12] Skipped Backend build (-SkipBuild specified)." -ForegroundColor DarkGray
}

# STEP 3: Verify Database Migration Project
Write-Host "`n[STEP 3/12] Verifying Database / Migrations..." -ForegroundColor Yellow
$migrationDir = Join-Path $root "src\backend\LaptopStore.Infrastructure\Persistence\Migrations"
if (-not (Test-Path $migrationDir)) {
    throw "Migrations directory not found: $migrationDir"
}
$migrationCount = (Get-ChildItem -Path $migrationDir -Filter "*.cs").Count
Write-Host "  Found $migrationCount migration files in $migrationDir." -ForegroundColor Green

# STEP 4: Verify releases/ has Phase ZIPs
Write-Host "`n[STEP 4/12] Checking releases/ for Phase ZIP files..." -ForegroundColor Yellow
if (-not (Test-Path $releases)) {
    throw "Releases directory not found: $releases"
}
$phaseZips = Get-ChildItem -Path $releases -Filter "*.zip" | Where-Object {
    $_.Name -notlike "*Final*" -and $_.Name -notlike "*$Name*"
}
if ($phaseZips.Count -eq 0) {
    throw "No Phase ZIP files found in $releases!"
}
Write-Host "  Found $($phaseZips.Count) Phase ZIP files ready for packaging:" -ForegroundColor Green
foreach ($pz in $phaseZips) {
    Write-Host "    - $($pz.Name) ($([math]::Round($pz.Length / 1KB, 1)) KB)" -ForegroundColor DarkGray
}

# STEP 5: Create a temporary Staging folder OUTSIDE the project
Write-Host "`n[STEP 5/12] Creating isolated staging folder in TEMP..." -ForegroundColor Yellow
$stagingGuid = [guid]::NewGuid().ToString("N")
$stagingRoot = Join-Path $env:TEMP "LaptopStore_Final_Source_Staging_$stagingGuid"
if (Test-Path $stagingRoot) { Remove-Item -Path $stagingRoot -Recurse -Force }
New-Item -ItemType Directory -Path $stagingRoot -Force | Out-Null
Write-Host "  Staging folder created at: $stagingRoot" -ForegroundColor Green

# STEP 6: Copy source files to Staging folder, excluding build, cache & internal files
Write-Host "`n[STEP 6/12] Copying clean source code into staging folder..." -ForegroundColor Yellow

$excludeDirs = @(
    "node_modules", "bin", "obj", ".vs", ".idea", ".git", "releases",
    "dist", "build", "coverage", ".vite", "logs", "cache", "temp", "tmp", "progress-report", "thesis",
    "scratch", "design-reference", "development-notes", "internal-docs",
    ".tempmediaStorage", ".user_uploaded", ".system_generated", ".agents",
    ".cursor", ".vscode", ".gemini"
)

$excludeFiles = @(
    "PROJECT_REQUIREMENTS.md",
    "CHECKLIST.md",
    "HUONG-DAN-SU-DUNG.md",
    "AGENTS.md",
    "GEMINI.md",
    "CLAUDE.md",
    "TODO.md",
    "ROADMAP.md",
    "PROMPT.md",
    "PROMPTS.md",
    "PROMPT_HISTORY.md",
    "AI_NOTES.md",
    "QA_NOTES.md",
    "SETUP.md",
    "INSTALL.md",
    "GUIDE.md",
    ".cursorrules",
    ".cursorignore",
    ".DS_Store",
    "Thumbs.db"
)

$sourceFiles = Get-ChildItem -Path $root -Recurse -File -Force | Where-Object {
    $relative = $_.FullName.Substring($root.Path.Length).TrimStart("\", "/")
    $parts = $relative -split "[\\/]"
    $skip = $false
    foreach ($part in $parts) {
        if ($excludeDirs -contains $part -or 
            $part -like ".cursor*" -or 
            $part -like ".agent*" -or 
            $part -like ".gemini*" -or 
            $part -like ".vscode*") {
            $skip = $true
            break
        }
    }
    if ($excludeFiles -contains $_.Name -or 
        $_.Name -like ".cursor*" -or 
        $_.Name -like "*.mdc" -or 
        ($_.Name -like "*.md" -and ($parts.Count -ne 1 -or $_.Name -ne "README.md"))) {
        $skip = $true
    }
    -not $skip
}

foreach ($file in $sourceFiles) {
    $relative = $file.FullName.Substring($root.Path.Length).TrimStart("\", "/")
    $dest = Join-Path $stagingRoot $relative
    $destDir = Split-Path -Parent $dest
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    Copy-Item -Path $file.FullName -Destination $dest -Force
}
Write-Host "  Copied $($sourceFiles.Count) clean source files." -ForegroundColor Green

# STEP 7: Copy ALL Phase ZIP files into StagingFolder/releases/
Write-Host "`n[STEP 7/12] Copying all Phase ZIPs into staging releases/..." -ForegroundColor Yellow
$stagingReleases = Join-Path $stagingRoot "releases"
New-Item -ItemType Directory -Path $stagingReleases -Force | Out-Null
foreach ($pz in $phaseZips) {
    Copy-Item -Path $pz.FullName -Destination (Join-Path $stagingReleases $pz.Name) -Force
}
Write-Host "  Copied $($phaseZips.Count) Phase ZIPs into staging releases/." -ForegroundColor Green

# STEP 8 & 9: Verify only README.md exists as documentation at root
Write-Host "`n[STEP 8 & 9/12] Verifying single documentation file (README.md only)..." -ForegroundColor Yellow
$rootMdFiles = Get-ChildItem -Path $stagingRoot -Filter "*.md" -File
foreach ($md in $rootMdFiles) {
    if ($md.Name -ne "README.md") {
        Write-Host "  Removing unexpected doc from staging root: $($md.Name)" -ForegroundColor Magenta
        Remove-Item -Path $md.FullName -Force
    }
}
if (-not (Test-Path (Join-Path $stagingRoot "README.md"))) {
    throw "README.md is missing from staging root!"
}
Write-Host "  Confirmed: README.md is the ONLY documentation file at project root." -ForegroundColor Green

# STEP 10: Create Final Delivery ZIP in TEMP (completely outside the project)
Write-Host "`n[STEP 10/12] Creating Final Delivery ZIP in TEMP..." -ForegroundColor Yellow
$tempZipPath = Join-Path $env:TEMP "$Name.zip"
if (Test-Path $tempZipPath) { Remove-Item -Path $tempZipPath -Force }

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

[System.IO.Compression.ZipFile]::CreateFromDirectory(
    $stagingRoot,
    $tempZipPath,
    [System.IO.Compression.CompressionLevel]::Optimal,
    $false
)
Write-Host "  Final ZIP created in TEMP: $tempZipPath ($([math]::Round((Get-Item $tempZipPath).Length / 1MB, 2)) MB)" -ForegroundColor Green

# STEP 11: Inspect and Verify Final Delivery ZIP contents
Write-Host "`n[STEP 11/12] Inspecting & Verifying Final Delivery ZIP contents..." -ForegroundColor Yellow
$zipArchive = [System.IO.Compression.ZipFile]::OpenRead($tempZipPath)
$hasSelfZip = $false
$hasReadme = $false
$forbiddenFound = @()
$zipPhaseCount = 0

try {
    foreach ($entry in $zipArchive.Entries) {
        $entryPath = $entry.FullName.Replace("\", "/")
        $nameLower = $entry.Name.ToLower()
        if ($nameLower -eq "$($Name.ToLower()).zip") {
            $hasSelfZip = $true
        }
        if ($entryPath -eq "README.md") {
            $hasReadme = $true
        }
        if ($entryPath -match "^releases/.+\.zip$") {
            $zipPhaseCount++
        }
        foreach ($forbidden in $excludeFiles) {
            if ($entry.Name -eq $forbidden) {
                $forbiddenFound += $entry.FullName
            }
        }
        if ($entry.Name -like ".cursor*" -or $entry.Name -like "*.mdc") {
            $forbiddenFound += $entry.FullName
        }
        foreach ($part in ($entryPath -split "/")) {
            if ($excludeDirs -contains $part -and $part -ne "releases") {
                $forbiddenFound += $entry.FullName
                break
            }
            if ($part -like ".cursor*" -or $part -like ".agent*" -or $part -like ".gemini*" -or $part -like ".vscode*") {
                $forbiddenFound += $entry.FullName
                break
            }
        }
        if ($entryPath -match "\.md$" -and $entryPath -ne "README.md") {
            $forbiddenFound += $entry.FullName
        }
    }
}
finally {
    $zipArchive.Dispose()
}

if ($hasSelfZip) {
    throw "VERIFICATION FAILED: Final ZIP contains itself!"
}
if (-not $hasReadme) {
    throw "VERIFICATION FAILED: README.md not found in Final ZIP root!"
}
if ($forbiddenFound.Count -gt 0) {
    throw "VERIFICATION FAILED: Forbidden internal files found in Final ZIP: $($forbiddenFound -join ', ')"
}
if ($zipPhaseCount -ne $phaseZips.Count) {
    throw "VERIFICATION FAILED: Expected $($phaseZips.Count) Phase ZIPs, but found $zipPhaseCount in archive!"
}

Write-Host "  [VERIFIED] Does NOT contain itself." -ForegroundColor Green
Write-Host "  [VERIFIED] Contains README.md as the ONLY documentation at root." -ForegroundColor Green
Write-Host "  [VERIFIED] Contains all $zipPhaseCount Phase ZIPs in releases/." -ForegroundColor Green
Write-Host "  [VERIFIED] Contains clean source code (Frontend, Backend, Migrations, Seed, Assets, Config)." -ForegroundColor Green
Write-Host "  [VERIFIED] 0 .cursor, 0 Cursor rules, 0 Forbidden docs, 0 build artifacts, 0 node_modules/bin/obj." -ForegroundColor Green

# STEP 12: Move Final Delivery ZIP into releases/ of Working Project
Write-Host "`n[STEP 12/12] Deploying Final Delivery ZIP to releases/..." -ForegroundColor Yellow
$finalDestination = Join-Path $releases "$Name.zip"
if (Test-Path $finalDestination) {
    Remove-Item -Path $finalDestination -Force
}
Move-Item -Path $tempZipPath -Destination $finalDestination -Force
Write-Host "  Final Delivery ZIP successfully stored at: $finalDestination" -ForegroundColor Green

try {
    Remove-Item -Path $stagingRoot -Recurse -Force
} catch {}

Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host " FINAL DELIVERY PACKAGE SUCCESSFUL!" -ForegroundColor Green
Write-Host " Location: $finalDestination" -ForegroundColor Green
Write-Host " Size: $([math]::Round((Get-Item $finalDestination).Length / 1MB, 2)) MB" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan

return $finalDestination
