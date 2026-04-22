param(
    [Parameter(Mandatory=$true)]
    [string]$PlanFile,
    [int]$MaxIterations = 30,
    [int]$SleepSeconds = 3
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not (Test-Path $PlanFile)) {
    Write-Error "Plan file not found: $PlanFile"
    exit 1
}

# --- Logging setup ---
# Each run gets its own log files so parallel runs (or re-runs) don't clobber each other.
$RunId = Get-Date -Format 'yyyyMMdd-HHmmss'
$LogsDir = Join-Path (Get-Location) 'logs'
New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null
$TranscriptPath = Join-Path $LogsDir ('ralph-run-' + $RunId + '.log')
$SummaryPath = Join-Path $LogsDir ('ralph-summary-' + $RunId + '.tsv')

# Full transcript (everything printed to console ends up here)
Start-Transcript -Path $TranscriptPath -Force | Out-Null

# TSV summary header: one row per iteration
"iteration`tstarted_at`tduration_sec`texit_code`tverdict" | Out-File -FilePath $SummaryPath -Encoding utf8

Write-Host "Starting Ralph Loop for tanar-site"
Write-Host "Plan:            $PlanFile"
Write-Host "Max iterations:  $MaxIterations"
Write-Host "Run id:          $RunId"
Write-Host "Transcript:      $TranscriptPath"
Write-Host "Summary:         $SummaryPath"
Write-Host ""

$prompt = @"
You are an autonomous execution agent for the tanar-site project.
Your working directory is the project root (tanar-site).

## Every iteration - start here

1. Read CLAUDE.md (project stack, commands, rules)
2. Read the plan file specified by the runner - single source of truth, follow it strictly
3. Read progress.md in the same folder as the plan - check learnings from previous iterations

Plan file path: ${PlanFile}

## Your job

Find the FIRST step in the plan marked [ ] (not done).
Read the corresponding step file in full.
Do EXACTLY that one step. Nothing else.
Do not skip ahead. Do not combine steps.

## After the step

Run ALL verification commands listed in the step file.
Capture their output. Every command must exit 0.

If ALL verifications PASS:
- Mark the step [x] in PLAN.md
- Append a PASS entry to progress.md (format below)
- Commit with Conventional Commits message, e.g.:
    git commit -m "feat(catalog): add product listing page"
    git commit -m "chore: scaffold next.js project"
- Do NOT push. Only commit.

If ANY verification FAILS:
- Do NOT mark the step done
- Do NOT commit
- Append a FAIL entry to progress.md with the exact error
- Stop this iteration (the next iteration will retry, reading your FAIL note)

## progress.md format

Append one block per iteration:

### Iteration [N] - [Step name] - [PASS/FAIL]
- What was done
- Files changed (short list)
- Verification results (command -> exit code)
- Learnings / gotchas for future iterations (if any)
---

## Guardrails

- Never run: git push, git reset --hard, rm -rf, npm publish, or any destructive op
- Never commit secrets or .env files
- Never skip hooks (--no-verify) or bypass typecheck
- If a step feels unsafe, ambiguous, or you're stuck for 3 iterations on the same step:
    Append a BLOCKED entry to progress.md explaining the blocker and output <promise>BLOCKED</promise>

## End condition

After completing your step, re-read the plan file:
- ALL steps [x] -> output exactly: <promise>COMPLETE</promise>
- Steps remain [ ] -> just end your response (next iteration continues)
- Blocked -> output exactly: <promise>BLOCKED</promise>
"@

$finalExitCode = 1

try {
    for ($i = 1; $i -le $MaxIterations; $i++) {
        $iterStart = Get-Date
        $timeStr = $iterStart.ToString('HH:mm:ss')
        Write-Host "==========================================="
        Write-Host ("  Iteration " + $i + " of " + $MaxIterations + " - " + $timeStr)
        Write-Host "==========================================="

        $result = (& claude --dangerously-skip-permissions -p $prompt 2>&1 | Out-String)
        $claudeExit = $LASTEXITCODE

        Write-Host $result
        Write-Host ""

        $duration = [int]((Get-Date) - $iterStart).TotalSeconds

        # Derive verdict for this iteration
        $verdict = 'continue'
        if ($result -match "<promise>COMPLETE</promise>") { $verdict = 'complete' }
        elseif ($result -match "<promise>BLOCKED</promise>") { $verdict = 'blocked' }
        elseif ($claudeExit -ne 0) { $verdict = 'claude-error' }

        # Append summary row (TSV, build via + to avoid any interpolation traps)
        $startedAt = $iterStart.ToString('yyyy-MM-ddTHH:mm:ss')
        $row = $i.ToString() + "`t" + $startedAt + "`t" + $duration.ToString() + "`t" + $claudeExit.ToString() + "`t" + $verdict
        $row | Out-File -FilePath $SummaryPath -Encoding utf8 -Append

        Write-Host ("  iter " + $i + " done in " + $duration + "s, exit=" + $claudeExit + ", verdict=" + $verdict)
        Write-Host ""

        if ($claudeExit -ne 0) {
            Write-Warning ("claude exited with code " + $claudeExit + " (continuing)")
        }

        if ($verdict -eq 'complete') {
            Write-Host "==========================================="
            Write-Host ("  Complete after " + $i + " iterations!")
            Write-Host "==========================================="
            $finalExitCode = 0
            break
        }

        if ($verdict -eq 'blocked') {
            Write-Host "==========================================="
            Write-Host ("  Ralph is BLOCKED after " + $i + " iterations.")
            Write-Host "  Check progress.md for details:"
            Write-Host "    task_tracker/todo/initial-build/progress.md"
            Write-Host "==========================================="
            $finalExitCode = 2
            break
        }

        Start-Sleep -Seconds $SleepSeconds
    }

    if ($finalExitCode -eq 1) {
        Write-Host "==========================================="
        Write-Host ("  Reached max iterations (" + $MaxIterations + ")")
        Write-Host "==========================================="
    }
}
finally {
    Write-Host ""
    Write-Host "Logs for this run:"
    Write-Host "  Transcript: $TranscriptPath"
    Write-Host "  Summary:    $SummaryPath"
    Stop-Transcript | Out-Null
}

exit $finalExitCode
