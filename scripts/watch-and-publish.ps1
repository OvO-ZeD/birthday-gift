$ErrorActionPreference = "Stop"

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $ProjectRoot

$DebounceSeconds = 8
$PollSeconds = 1

function Invoke-Git {
    param([Parameter(Mandatory)][string[]]$Arguments)

    $output = & git @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Git failed: git $($Arguments -join ' ')`n$($output -join "`n")"
    }
    return $output
}

function Get-TrackedStatus {
    $output = Invoke-Git -Arguments @("status", "--porcelain", "--untracked-files=no")
    return ($output -join "`n").Trim()
}

function Assert-SafeChangedPaths {
    $paths = Invoke-Git -Arguments @("diff", "--name-only", "HEAD", "--")
    $blocked = @(
        $paths | Where-Object {
            $_ -match '(?i)(^|/)\.env($|\.)' -or
            $_ -match '(?i)(^|/)(id_rsa|id_ed25519)(\.|$)' -or
            $_ -match '(?i)\.(pem|p12|pfx|key)$' -or
            $_ -match '(?i)(^|/)(credentials|secrets?)(\.|/|$)'
        }
    )

    if ($blocked.Count -gt 0) {
        throw "Safety stop: potentially sensitive paths changed:`n$($blocked -join "`n")`nNothing was committed or pushed. Review these files manually."
    }
}

function Publish-TrackedChanges {
    $status = Get-TrackedStatus
    if (-not $status) {
        Write-Host "No tracked changes to publish." -ForegroundColor DarkGray
        return
    }

    Write-Host "`nChecking changed file paths..." -ForegroundColor Cyan
    Assert-SafeChangedPaths

    Write-Host "`nRunning production build..." -ForegroundColor Cyan
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) {
        throw "Build failed. Nothing was committed or pushed. Fix the errors, save your changes, and restart the watcher."
    }

    # Stage modifications and deletions to tracked files only.
    # New, untracked files are deliberately not added automatically.
    Assert-SafeChangedPaths
    Invoke-Git -Arguments @("add", "-u", "--", ".") | Out-Null

    $staged = Invoke-Git -Arguments @("diff", "--cached", "--name-only")
    if (-not $staged -or -not ($staged -join "").Trim()) {
        Write-Host "No tracked changes were staged." -ForegroundColor DarkGray
        return
    }

    # Check whitespace errors before creating a commit.
    Invoke-Git -Arguments @("diff", "--cached", "--check") | Out-Null

    # Extra protection against common accidental secret additions.
    $stagedDiff = Invoke-Git -Arguments @("diff", "--cached", "--unified=0")
    $diffText = $stagedDiff -join "`n"
    if (
        $diffText -match '-----BEGIN [A-Z ]*PRIVATE KEY-----' -or
        $diffText -match '(?i)SUPABASE_SECRET_KEY\s*[:=]\s*["'']?[A-Za-z0-9_-]{20,}' -or
        $diffText -match '\bsb_secret_[A-Za-z0-9_-]{12,}' -or
        $diffText -match '\bsk-[A-Za-z0-9_-]{20,}'
    ) {
        throw "Safety stop: the staged diff resembles a secret or private key. Nothing was committed or pushed. Review the staged diff with: git diff --cached"
    }

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Invoke-Git -Arguments @("commit", "-m", "Auto-publish saved changes $timestamp") | Out-Null

    Write-Host "`nPushing commit to GitHub main..." -ForegroundColor Cyan
    try {
        Invoke-Git -Arguments @("push", "origin", "main") | Out-Null
    }
    catch {
        Write-Host "`nPUSH FAILED. Your local commit is preserved." -ForegroundColor Red
        Write-Host "Do not force-push. Check GitHub connectivity and run: git status; git push origin main"
        throw
    }

    Write-Host "`nPush succeeded. Vercel should now start a deployment." -ForegroundColor Green
}

$branch = (Invoke-Git -Arguments @("branch", "--show-current") | Select-Object -First 1).Trim()
if ($branch -ne "main") {
    throw "Safety stop: this watcher only publishes the main branch. Current branch: $branch"
}

$null = Invoke-Git -Arguments @("remote", "get-url", "origin")

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $ProjectRoot
$watcher.IncludeSubdirectories = $true
$watcher.NotifyFilter = [IO.NotifyFilters]::LastWrite -bor [IO.NotifyFilters]::FileName -bor [IO.NotifyFilters]::DirectoryName
$watcher.InternalBufferSize = 32768

$sourceIds = @(
    "BirthdayGift.Changed",
    "BirthdayGift.Created",
    "BirthdayGift.Deleted",
    "BirthdayGift.Renamed"
)

try {
    Register-ObjectEvent $watcher Changed -SourceIdentifier $sourceIds[0] | Out-Null
    Register-ObjectEvent $watcher Created -SourceIdentifier $sourceIds[1] | Out-Null
    Register-ObjectEvent $watcher Deleted -SourceIdentifier $sourceIds[2] | Out-Null
    Register-ObjectEvent $watcher Renamed -SourceIdentifier $sourceIds[3] | Out-Null

    $watcher.EnableRaisingEvents = $true

    Write-Host "`nBirthday Gift auto-publisher is running." -ForegroundColor Green
    Write-Host "Project: $ProjectRoot"
    Write-Host "Branch: main | Debounce: $DebounceSeconds seconds"
    Write-Host "Press Ctrl+C to stop. Keep this terminal open.`n"

    $lastChange = $null

    while ($true) {
        $null = Wait-Event -Timeout $PollSeconds

        $events = @(Get-Event | Where-Object { $sourceIds -contains $_.SourceIdentifier })
        foreach ($eventItem in $events) {
            $path = $eventItem.SourceEventArgs.FullPath
            Remove-Event -EventIdentifier $eventItem.EventIdentifier -ErrorAction SilentlyContinue

            if (-not $path) { continue }

            $relative = $path.Substring($ProjectRoot.Length).TrimStart('\', '/').Replace('\', '/')

            if (
                $relative -match '(^|/)\.git(/|$)' -or
                $relative -match '(^|/)(node_modules|\.next|\.vercel|coverage|out|dist)(/|$)' -or
                $relative -match '(^|/)\.env' -or
                $relative -match '(^|/)(scripts/watch-and-publish\.ps1)$'
            ) {
                continue
            }

            $lastChange = Get-Date
        }

        if ($lastChange -and ((Get-Date) - $lastChange).TotalSeconds -ge $DebounceSeconds) {
            $lastChange = $null

            try {
                Publish-TrackedChanges
            }
            catch {
                Write-Host "`nAUTO-PUBLISH STOPPED: $($_.Exception.Message)" -ForegroundColor Red
                Write-Host "The watcher has stopped to avoid repeated commits or unsafe pushes."
                throw
            }

            # If edits occurred while building/pushing, give them a fresh debounce window.
            if (Get-TrackedStatus) {
                $lastChange = Get-Date
            }
        }
    }
}
finally {
    $watcher.EnableRaisingEvents = $false
    $watcher.Dispose()
    foreach ($sourceId in $sourceIds) {
        Unregister-Event -SourceIdentifier $sourceId -ErrorAction SilentlyContinue
    }
    Get-Event | Where-Object { $sourceIds -contains $_.SourceIdentifier } |
        Remove-Event -ErrorAction SilentlyContinue
}
