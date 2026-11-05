param(
    [string]$Name = "",
    [switch]$Final,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

if ($Final -or ($Name -match "^final" -or $Name -match "_final")) {
    $finalScript = Join-Path $PSScriptRoot "pack-final.ps1"
    if (Test-Path $finalScript) {
        $finalArgs = @{}
        if ($Name -and $Name -notmatch "^final$") { $finalArgs["Name"] = $Name }
        if ($SkipBuild) { $finalArgs["SkipBuild"] = $true }
        & $finalScript @finalArgs
        exit $LASTEXITCODE
    }
}

if (-not $Name) {
    throw "Parameter -Name is mandatory for Phase packaging."
}

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$releases = Join-Path $root "releases"
New-Item -ItemType Directory -Force -Path $releases | Out-Null

$zipPath = Join-Path $releases "$Name.zip"
if (Test-Path $zipPath) {
    throw "Release already exists: $zipPath"
}

$excludeDirs = @(
    "node_modules", "bin", "obj", ".vs", ".idea", ".git", "releases",
    "dist", ".vite", "logs", "cache", "temp", "tmp", "progress-report", "thesis",
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
    "TODO.md",
    "ROADMAP.md",
    "PROMPT.md",
    "PROMPTS.md",
    "AI_NOTES.md",
    "SETUP.md",
    "INSTALL.md",
    "GUIDE.md",
    ".cursorrules",
    ".cursorignore",
    ".DS_Store",
    "Thumbs.db"
)

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    $files = Get-ChildItem -Path $root -Recurse -File -Force | Where-Object {
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
            ($parts.Count -eq 1 -and $_.Name -like "*.md" -and $_.Name -ne "README.md")) {
            $skip = $true
        }
        -not $skip
    }

    foreach ($file in $files) {
        $relative = $file.FullName.Substring($root.Path.Length).TrimStart("\", "/").Replace("\", "/")
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, $relative) | Out-Null
    }
}
finally {
    $zip.Dispose()
}

$zipArchive = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
$hasReadme = $false
$forbiddenFound = @()
$hasReleases = $false

try {
    foreach ($entry in $zipArchive.Entries) {
        $entryPath = $entry.FullName.Replace("\", "/")
        if ($entryPath -eq "README.md") { $hasReadme = $true }
        if ($entryPath -match "^releases/") { $hasReleases = $true }
        foreach ($forbidden in $excludeFiles) {
            if ($entry.Name -eq $forbidden) { $forbiddenFound += $entry.FullName }
        }
        if ($entry.Name -like ".cursor*" -or $entry.Name -like "*.mdc") {
            $forbiddenFound += $entry.FullName
        }
        foreach ($part in ($entryPath -split "/")) {
            if ($excludeDirs -contains $part) {
                $forbiddenFound += $entry.FullName
                break
            }
            if ($part -like ".cursor*" -or $part -like ".agent*" -or $part -like ".gemini*" -or $part -like ".vscode*") {
                $forbiddenFound += $entry.FullName
                break
            }
        }
    }
}
finally {
    $zipArchive.Dispose()
}

if (-not $hasReadme) {
    Remove-Item -Path $zipPath -Force
    throw "VERIFICATION FAILED: README.md not found in Phase ZIP!"
}
if ($hasReleases) {
    Remove-Item -Path $zipPath -Force
    throw "VERIFICATION FAILED: Phase ZIP must NOT contain releases/ or nested phase zips!"
}
if ($forbiddenFound.Count -gt 0) {
    Remove-Item -Path $zipPath -Force
    throw "VERIFICATION FAILED: Forbidden internal files found: $($forbiddenFound -join ', ')"
}

Write-Host "Phase ZIP successfully created and verified: $zipPath" -ForegroundColor Green
Write-Output $zipPath
