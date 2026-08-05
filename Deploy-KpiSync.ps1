param(
  [switch]$Login,
  [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"
$projectRef = "hqquobfaccxnydeyvioe"
$expectedDeploymentVersion = "2026.08.04.3"
$cli = Join-Path $PSScriptRoot "tools\supabase-cli\supabase.exe"

if (-not (Test-Path -LiteralPath $cli)) {
  throw "Khong tim thay Supabase CLI tai $cli. Hay tai lai bo ma nguon day du."
}

function Get-KpiSyncStatus {
  Invoke-RestMethod -Uri "https://$projectRef.supabase.co/functions/v1/kpi-sync?action=status" -Method Get
}

if ($CheckOnly) {
  & $cli --version
  if ($LASTEXITCODE -ne 0) {
    throw "Khong the chay Supabase CLI."
  }
  $status = Get-KpiSyncStatus
  Write-Host "May chu dang chay kpi-sync $($status.deploymentVersion). Phien ban yeu cau: $expectedDeploymentVersion."
  if ([string]$status.deploymentVersion -ne $expectedDeploymentVersion) {
    throw "Edge Function chua duoc cap nhat dung phien ban. Hay chay .\Deploy-KpiSync.ps1 sau khi dang nhap."
  }
  return
}

if ($Login) {
  & $cli login
  if ($LASTEXITCODE -ne 0) {
    throw "Dang nhap Supabase khong thanh cong."
  }
}

& $cli functions deploy kpi-sync --project-ref $projectRef

if ($LASTEXITCODE -ne 0) {
  throw "Khong the thuc hien thao tac voi Supabase. Kiem tra lai dang nhap, quyen Owner/Developer cua du an va ket noi Internet."
}

$status = Get-KpiSyncStatus
if ([string]$status.deploymentVersion -ne $expectedDeploymentVersion) {
  throw "Deploy da ket thuc nhung may chu van bao phien ban $($status.deploymentVersion). Khong tiep tuc su dung cho den khi kiem tra lai thanh cong."
}

Write-Host "Hoan tat. May chu dang chay kpi-sync $expectedDeploymentVersion."
