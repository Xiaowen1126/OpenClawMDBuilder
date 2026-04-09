param(
  [int]$Port = 8787
)

$nodeCmd = $null
$nodeInPath = Get-Command node -ErrorAction SilentlyContinue
if ($nodeInPath) {
  $nodeCmd = $nodeInPath.Source
} else {
  $candidates = @(
    "$env:ProgramFiles\nodejs\node.exe",
    "$env:ProgramFiles(x86)\nodejs\node.exe",
    "$env:LOCALAPPDATA\Programs\nodejs\node.exe"
  )
  foreach ($p in $candidates) {
    if ($p -and (Test-Path $p)) {
      $nodeCmd = $p
      break
    }
  }
}

if (-not $nodeCmd) {
  Write-Host ""
  Write-Host "Node.js not found (requires Node.js 18+)." -ForegroundColor Red
  Write-Host "Install command (Windows): winget install OpenJS.NodeJS.LTS"
  Write-Host "After install, reopen terminal and run start-app.bat again."
  Write-Host ""
  exit 1
}

if (-not (Test-Path ".\\node_modules")) {
  Write-Host "Installing dependencies..."
  npm install
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

$env:PORT = "$Port"
Write-Host "Starting server on http://127.0.0.1:$Port"
Start-Process "http://127.0.0.1:$Port" | Out-Null
& $nodeCmd .\server.js
