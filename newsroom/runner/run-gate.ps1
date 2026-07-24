<#
Cooldown lock so multiple missed-trigger catch-ups (StartWhenAvailable) firing
back-to-back when the PC wakes only actually run the cycle once, not 2-3 times
in a row. Legitimate scheduled runs are 6 hours apart, so a much shorter
cooldown safely distinguishes "stacked catch-up" from "the next real slot".
#>
param(
    [Parameter(Mandatory = $true)][string]$LockFile,
    [int]$CooldownMinutes = 60
)

$now = Get-Date

if (Test-Path $LockFile) {
    try {
        $last = [datetime]::Parse((Get-Content $LockFile -Raw).Trim())
        if (($now - $last).TotalMinutes -lt $CooldownMinutes) {
            Write-Output "SKIP"
            exit 0
        }
    } catch {
        # Unparsable/corrupt lock file -- fall through and treat as no lock.
    }
}

New-Item -ItemType Directory -Force -Path (Split-Path $LockFile) | Out-Null
Set-Content -Path $LockFile -Value $now.ToString("o") -NoNewline
Write-Output "GO"
