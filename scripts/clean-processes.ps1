# Kill orphaned processes and clean dev caches to prevent memory exhaustion
# ─────────────────────────────────────────────────────────────────────────────

param(
    [switch]$SkipProcessClean  # Use -SkipProcessClean to only clean caches
)

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

# ── 1. Terminate orphaned Node.js and Turborepo processes ─────────────────────
if (-not $SkipProcessClean) {
    # Collect all ancestor process IDs to prevent killing parent IDE/shell
    $ancestorPids = @($PID)
    $current = $PID
    while ($current) {
        $parent = (Get-CimInstance Win32_Process -Filter "ProcessId = $current" -ErrorAction SilentlyContinue).ParentProcessId
        if ($parent -and $parent -ne 0 -and ($ancestorPids -notcontains $parent)) {
            $ancestorPids += $parent
            $current = $parent
        } else {
            break
        }
    }

    $targetProcesses = Get-Process node, turbo -ErrorAction SilentlyContinue |
        Where-Object { $ancestorPids -notcontains $_.Id }

    $processCount = 0
    if ($targetProcesses) {
        $processCount = $targetProcesses.Count
        $targetProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    }

    # Release dev ports (3000, 3001, 3002, 3011)
    $ports = @(3000, 3001, 3002, 3011)
    foreach ($port in $ports) {
        $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($connections) {
            foreach ($conn in $connections) {
                $procId = $conn.OwningProcess
                if ($procId -and ($ancestorPids -notcontains $procId)) {
                    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
                }
            }
        }
    }

    Write-Host "Killed $processCount orphaned background processes and freed ports 3000-3002, 3011." -ForegroundColor Green
}

# ── 2. Delete stale .next and .turbo build caches ─────────────────────────────
# These caches are exposed through npm workspace junction symlinks in node_modules/,
# causing Turbopack's file watcher to see build output as dependency changes,
# triggering infinite recompilation loops that consume all available RAM.

$cachePaths = @(
    "$projectRoot\apps\web\.next",
    "$projectRoot\apps\app\.next",
    "$projectRoot\apps\web\.turbo",
    "$projectRoot\apps\app\.turbo"
)

$cleanedMB = 0
foreach ($cachePath in $cachePaths) {
    if (Test-Path $cachePath) {
        $size = (Get-ChildItem -Path $cachePath -Recurse -File -ErrorAction SilentlyContinue |
            Measure-Object -Property Length -Sum).Sum
        $cleanedMB += [math]::Round($size / 1MB, 1)
        Remove-Item -Path $cachePath -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "Cleaned ${cleanedMB} MB of stale .next/.turbo build caches." -ForegroundColor Cyan
