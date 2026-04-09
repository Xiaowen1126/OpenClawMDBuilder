param(
  [string]$RepoUrl = "https://github.com/Xiaowen1126/OpenClawMDBuilder.git",
  [string]$Branch = "main",
  [string]$InstallDir = "$env:USERPROFILE\OpenClawMDBuilder",
  [int]$Port = 8787
)

$ErrorActionPreference = "Stop"

function Write-Info($msg) {
  Write-Host "[install-online] $msg"
}

function Ensure-Command($name) {
  return Get-Command $name -ErrorAction SilentlyContinue
}

function Ensure-Git {
  if (Ensure-Command "git") { return }
  if (Ensure-Command "winget") {
    Write-Info "Installing Git via winget..."
    winget install --id Git.Git -e --accept-source-agreements --accept-package-agreements
  } else {
    throw "Git is required. Install it manually: https://git-scm.com/download/win"
  }
}

function Ensure-Node {
  $nodeCmd = Ensure-Command "node"
  if ($nodeCmd) { return }
  if (Ensure-Command "winget") {
    Write-Info "Installing Node.js LTS via winget..."
    winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
  } else {
    throw "Node.js 18+ is required. Install manually: https://nodejs.org/"
  }
}

function Refresh-NodePath {
  $candidates = @(
    "$env:ProgramFiles\nodejs",
    "$env:ProgramFiles(x86)\nodejs",
    "$env:LOCALAPPDATA\Programs\nodejs"
  )
  foreach ($p in $candidates) {
    if (Test-Path $p) {
      if (-not ($env:PATH -split ";" | Where-Object { $_ -eq $p })) {
        $env:PATH = "$p;$env:PATH"
      }
    }
  }
}

Write-Info "Starting..."
Ensure-Git
Ensure-Node
Refresh-NodePath

if (Test-Path "$InstallDir\.git") {
  Write-Info "Repository exists, updating..."
  git -C $InstallDir fetch --all --prune
  git -C $InstallDir checkout $Branch
  git -C $InstallDir pull --ff-only origin $Branch
} else {
  Write-Info "Cloning repository to $InstallDir ..."
  New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
  git clone --branch $Branch --depth 1 $RepoUrl $InstallDir
}

Write-Info "Launching server..."
Set-Location $InstallDir
powershell -NoProfile -ExecutionPolicy Bypass -File ".\start-server.ps1" -Port $Port
