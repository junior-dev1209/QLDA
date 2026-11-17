param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[A-Za-z0-9._-]{3,96}$')]
  [string]$Username,

  [Parameter(Mandatory = $true)]
  [ValidateLength(1, 128)]
  [string]$Password,

  [switch]$Login
)

$ErrorActionPreference = "Stop"
$projectRef = "hqquobfaccxnydeyvioe"
$cli = Join-Path $PSScriptRoot "tools\supabase-cli\supabase.exe"

if (-not (Test-Path -LiteralPath $cli)) {
  throw "Khong tim thay Supabase CLI tai $cli."
}

if ($Login) {
  & $cli login
  if ($LASTEXITCODE -ne 0) { throw "Dang nhap Supabase khong thanh cong." }
}

& $cli secrets set --project-ref $projectRef "KPI_BOOTSTRAP_ADMIN_USERNAME=$Username" "KPI_BOOTSTRAP_ADMIN_PASSWORD=$Password"
if ($LASTEXITCODE -ne 0) {
  throw "Khong the luu thong tin khoi phuc Admin tren Supabase. Hay dang nhap Supabase va thu lai."
}

& $cli functions deploy kpi-sync --project-ref $projectRef
if ($LASTEXITCODE -ne 0) {
  throw "Khong the deploy kpi-sync. Thong tin khoi phuc da duoc luu, hay deploy lai sau khi ket noi on dinh."
}

Write-Host "Hoan tat. Dang nhap lai bang tai khoan $Username va mat khau vua dat."
