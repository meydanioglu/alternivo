# Docker olmadan yerel calistirma: .NET 10 SDK + PostgreSQL (kurulu) + Node.js
$ErrorActionPreference = "Continue"
Set-Location $PSScriptRoot
$root = $PSScriptRoot
$log = Join-Path $root "calistir-log.txt"
"=== yerel mod $(Get-Date -Format s) ===" | Out-File $log -Encoding utf8
function Log($m, $color = "Gray") { Write-Host $m -ForegroundColor $color; $m | Out-File $log -Append -Encoding utf8 }
function Step($m) { Log "`n==> $m" "Cyan" }
function Fail($m) { Log "`nHATA: $m" "Red"; Log "Tum cikti: $log  (bu dosyayi Claude'a gonderin)" "Yellow"; Read-Host "`nKapatmak icin Enter"; exit 1 }
function Gen { -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ }) }
function RefreshPath { $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User") }

# ---------- .NET 10 SDK ----------
Step ".NET SDK kontrol ediliyor"
$sdks = (& dotnet --list-sdks 2>$null) -join "`n"
Log $sdks
if ($sdks -notmatch '(?m)^10\.') {
  Step ".NET 10 SDK kuruluyor (winget)"
  winget install --id Microsoft.DotNet.SDK.10 -e --accept-source-agreements --accept-package-agreements 2>&1 | Tee-Object -FilePath $log -Append | Out-Host
  RefreshPath
  if (((& dotnet --list-sdks 2>$null) -join "`n") -notmatch '(?m)^10\.') { Fail ".NET 10 SDK kurulamadi. https://dotnet.microsoft.com/download/dotnet/10.0 adresinden kurup tekrar deneyin." }
}

# ---------- Node.js ----------
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { Fail "Node.js bulunamadi. https://nodejs.org (22 LTS) kurun." }
Log "Node: $(node -v)"

# ---------- PostgreSQL ----------
Step "PostgreSQL kontrol ediliyor"
$psql = (Get-Command psql -ErrorAction SilentlyContinue).Source
if (-not $psql) { $psql = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\psql.exe" -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName }
if (-not $psql) { Fail "PostgreSQL (psql.exe) bulunamadi." }
Log "psql: $psql"
$svc = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($svc -and $svc.Status -ne "Running") {
  Log "PostgreSQL servisi baslatiliyor: $($svc.Name)"
  Start-Service $svc.Name -ErrorAction SilentlyContinue
  if ((Get-Service $svc.Name).Status -ne "Running") { Fail "PostgreSQL servisi kapali. Hizmetler (services.msc) icinden '$($svc.Name)' servisini baslatin." }
}

$envFile = Join-Path $root ".env.local.ps1"
if (-not (Test-Path $envFile)) {
  Step "Veritabani olusturuluyor"
  Write-Host "PostgreSQL kurulumunda belirlediginiz 'postgres' kullanicisinin sifresi gerekiyor." -ForegroundColor Yellow
  $sec = Read-Host "postgres sifresi" -AsSecureString
  $env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
  $dbPass = Gen
  $sql = @"
DO `$`$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'discovery') THEN CREATE ROLE discovery LOGIN PASSWORD '$dbPass';
  ELSE ALTER ROLE discovery WITH LOGIN PASSWORD '$dbPass'; END IF;
END `$`$;
"@
  & $psql -h localhost -U postgres -d postgres -v ON_ERROR_STOP=1 -c $sql 2>&1 | Tee-Object -FilePath $log -Append | Out-Host
  if ($LASTEXITCODE -ne 0) { Fail "postgres ile baglanilamadi (sifre yanlis olabilir)." }
  $exists = & $psql -h localhost -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='discovery'"
  if ($exists -ne "1") { & $psql -h localhost -U postgres -d postgres -c "CREATE DATABASE discovery OWNER discovery" 2>&1 | Tee-Object -FilePath $log -Append | Out-Host }
  & $psql -h localhost -U postgres -d discovery -c "CREATE EXTENSION IF NOT EXISTS pg_trgm" 2>&1 | Tee-Object -FilePath $log -Append | Out-Host
  if ($LASTEXITCODE -ne 0) { Fail "pg_trgm eklentisi kurulamadi." }
  Remove-Item Env:PGPASSWORD
  $adminPass = Gen
  @"
`$env:ConnectionStrings__Postgres = 'Host=localhost;Port=5432;Database=discovery;Username=discovery;Password=$dbPass'
`$env:Api__InternalKey = '$(Gen)'
`$env:Admin__Email = 'admin@alternivo.com'
`$env:Admin__Password = '$adminPass'
"@ | Out-File $envFile -Encoding ascii
}
. $envFile

# ---------- Migration ----------
$mig = Join-Path $root "backend\src\Discovery.Infrastructure\Persistence\Migrations"
$tools = Join-Path $root "backend\.tools"
if (-not (Test-Path $mig) -or -not (Get-ChildItem $mig -Filter *.cs -ErrorAction SilentlyContinue)) {
  Step "Backend derleniyor ve ilk migration olusturuluyor (ilk seferde birkac dakika)"
  if (-not (Test-Path (Join-Path $tools "dotnet-ef.exe"))) {
    dotnet tool install --tool-path $tools dotnet-ef --version "10.*" 2>&1 | Tee-Object -FilePath $log -Append | Out-Host
  }
  Push-Location (Join-Path $root "backend")
  & (Join-Path $tools "dotnet-ef.exe") migrations add InitialCreate --project src/Discovery.Infrastructure --startup-project src/Discovery.Api --output-dir Persistence/Migrations 2>&1 | Tee-Object -FilePath $log -Append | Out-Host
  $code = $LASTEXITCODE
  Pop-Location
  if ($code -ne 0) { Fail "Migration olusturulamadi (buyuk ihtimalle derleme hatasi)." }
}

# ---------- API ----------
Step "API baslatiliyor (yeni pencere: http://localhost:8080)"
$apiLog = Join-Path $root "api-log.txt"
$apiCmd = @"
Set-Location '$root\backend'
. '$envFile'
`$env:ASPNETCORE_ENVIRONMENT = 'Development'
`$env:ASPNETCORE_URLS = 'http://localhost:8080'
`$env:Seed__OnStartup = 'true'
`$Host.UI.RawUI.WindowTitle = 'Alternivo API'
dotnet run --project src/Discovery.Api 2>&1 | Tee-Object -FilePath '$apiLog'
"@
Start-Process powershell -ArgumentList "-NoExit", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $apiCmd

# ---------- Frontend ----------
Step "Frontend paketleri kuruluyor (ilk seferde birkac dakika)"
$fe = Join-Path $root "frontend"
@"
NEXT_PUBLIC_SITE_NAME=Alternivo
NEXT_PUBLIC_SITE_URL=http://localhost:3000
API_INTERNAL_URL=http://localhost:8080
API_INTERNAL_KEY=$($env:Api__InternalKey)
"@ | Out-File (Join-Path $fe ".env.local") -Encoding ascii
if (-not (Test-Path (Join-Path $fe "node_modules"))) {
  Push-Location $fe
  npm install 2>&1 | Tee-Object -FilePath $log -Append | Out-Host
  $code = $LASTEXITCODE
  Pop-Location
  if ($code -ne 0) { Fail "npm install basarisiz." }
}

Step "API'nin hazir olmasi bekleniyor (veritabani kurulumu + veri yukleme)"
$ok = $false
for ($i = 0; $i -lt 90; $i++) {
  try { if ((Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 http://localhost:8080/health).StatusCode -eq 200) { $ok = $true; break } } catch {}
  Start-Sleep 5
}
if (-not $ok) { Fail "API hazir olmadi. 'Alternivo API' penceresindeki hatayi ve api-log.txt dosyasini kontrol edin." }
Log "  API hazir." "Green"

Step "Web sitesi baslatiliyor (yeni pencere: http://localhost:3000)"
$webLog = Join-Path $root "web-log.txt"
$webCmd = "Set-Location '$fe'; `$Host.UI.RawUI.WindowTitle = 'Alternivo Web'; npm run dev 2>&1 | Tee-Object -FilePath '$webLog'"
Start-Process powershell -ArgumentList "-NoExit", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $webCmd

$ok = $false
for ($i = 0; $i -lt 60; $i++) {
  try { if ((Invoke-WebRequest -UseBasicParsing -TimeoutSec 60 http://localhost:3000/).StatusCode -eq 200) { $ok = $true; break } } catch { $last = $_.Exception.Message }
  Start-Sleep 5
}
if (-not $ok) { Fail "Web sitesi acilmadi. Son hata: $last  ('Alternivo Web' penceresine ve web-log.txt dosyasina bakin)" }

Log "`nHAZIR!" "Green"
Log "  Site:    http://localhost:3000"
Log "  Swagger: http://localhost:8080/swagger"
Log "  Admin:   $($env:Admin__Email) / (sifre .env.local.ps1 icinde)"
Log "  Durdurmak icin 'Alternivo API' ve 'Alternivo Web' pencerelerini kapatin."
Start-Process "http://localhost:3000"
Read-Host "`nKapatmak icin Enter"
