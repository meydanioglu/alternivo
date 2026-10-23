# Alternivo / Alternivo - yerel calistirma (Windows + Docker Desktop)
# calistir.bat dosyasina cift tiklayarak baslatin.
$ErrorActionPreference = "Continue"
Set-Location $PSScriptRoot
$log = Join-Path $PSScriptRoot "calistir-log.txt"
"=== $(Get-Date -Format s) ===" | Out-File $log -Encoding utf8

function Log($m, $color = "Gray") { Write-Host $m -ForegroundColor $color; $m | Out-File $log -Append -Encoding utf8 }
function Step($m) { Log "`n==> $m" "Cyan" }
function Run([string[]]$cmd) {
  & $cmd[0] $cmd[1..($cmd.Length - 1)] 2>&1 | ForEach-Object { "$_" } | Tee-Object -FilePath $log -Append | Out-Host
  return $LASTEXITCODE
}
function Fail($m) {
  Log "`nHATA: $m" "Red"
  if (Get-Command docker -ErrorAction SilentlyContinue) {
    Log "`n--- docker compose ps ---"; Run @("docker", "compose", "ps", "-a") | Out-Null
    Log "`n--- api log ---"; Run @("docker", "compose", "logs", "--tail", "150", "api") | Out-Null
    Log "`n--- web log ---"; Run @("docker", "compose", "logs", "--tail", "80", "web") | Out-Null
  }
  Log "`nTum cikti: $log  (bu dosyayi Claude'a gonderin)" "Yellow"
  Read-Host "`nKapatmak icin Enter"
  exit 1
}

Step "Ortam kontrol ediliyor"
foreach ($t in "docker", "dotnet", "node", "psql") {
  $c = Get-Command $t -ErrorAction SilentlyContinue
  Log ("  {0,-7} {1}" -f $t, $(if ($c) { $c.Source } else { "YOK" }))
}
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Log "Docker yok: Docker'siz yerel moda geciliyor." "Yellow"
  & (Join-Path $PSScriptRoot "calistir-yerel.ps1")
  exit $LASTEXITCODE
}
docker info *> $null
if ($LASTEXITCODE -ne 0) { Fail "Docker calismiyor. Docker Desktop'i acip 'Engine running' yazisini bekleyin, sonra tekrar calistirin." }

if (-not (Test-Path ".env")) {
  Step ".env olusturuluyor (rastgele sifrelerle)"
  function Gen { -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ }) }
  $adminPass = Gen
  $lines = Get-Content ".env.example" | ForEach-Object {
    $_ -replace '^SITE_URL=.*', 'SITE_URL=http://localhost:3000' `
       -replace '^POSTGRES_PASSWORD=.*', "POSTGRES_PASSWORD=$(Gen)" `
       -replace '^API_INTERNAL_KEY=.*', "API_INTERNAL_KEY=$(Gen)" `
       -replace '^ADMIN_EMAIL=.*', 'ADMIN_EMAIL=admin@alternivo.com' `
       -replace '^ADMIN_PASSWORD=.*', "ADMIN_PASSWORD=$adminPass" `
       -replace '^REQUIRE_CONFIRMED_EMAIL=.*', 'REQUIRE_CONFIRMED_EMAIL=false' `
       -replace '^SWAGGER_ENABLED=.*', 'SWAGGER_ENABLED=true'
  }
  [IO.File]::WriteAllText((Join-Path $PSScriptRoot ".env"), (($lines -join "`n") + "`n"))
}

$mig = "backend\src\Discovery.Infrastructure\Persistence\Migrations"
if (-not (Test-Path $mig) -or -not (Get-ChildItem $mig -Filter *.cs -ErrorAction SilentlyContinue)) {
  Step "Ilk veritabani migration'i olusturuluyor (ilk seferde birkac dakika surer)"
  $src = (Resolve-Path "backend").Path
  $code = Run @("docker", "run", "--rm", "-v", "${src}:/src", "-w", "/src", "-e", "HOME=/tmp", "-e", "DOTNET_CLI_TELEMETRY_OPTOUT=1",
    "mcr.microsoft.com/dotnet/sdk:10.0", "bash", "-c",
    "dotnet tool install --tool-path /tmp/tools dotnet-ef --version '10.*' && /tmp/tools/dotnet-ef migrations add InitialCreate --project src/Discovery.Infrastructure --startup-project src/Discovery.Api --output-dir Persistence/Migrations")
  if ($code -ne 0) { Fail "Migration olusturulamadi (buyuk ihtimalle derleme hatasi)." }
}

Step "Konteynerler derleniyor ve baslatiliyor (ilk seferde 5-15 dakika surebilir)"
$code = Run @("docker", "compose", "up", "-d", "--build", "postgres", "redis", "api", "web")
if ($code -ne 0) { Fail "docker compose basarisiz oldu." }

Step "API'nin hazir olmasi bekleniyor"
$ok = $false
for ($i = 0; $i -lt 60; $i++) {
  try { if ((Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 http://127.0.0.1:8080/health).StatusCode -eq 200) { $ok = $true; break } } catch {}
  Start-Sleep 5
}
if (-not $ok) { Fail "API 5 dakikada hazir olmadi." }
Log "  API hazir." "Green"

Step "Web sitesi bekleniyor"
$ok = $false
for ($i = 0; $i -lt 36; $i++) {
  try { if ((Invoke-WebRequest -UseBasicParsing -TimeoutSec 15 http://127.0.0.1:3000/).StatusCode -eq 200) { $ok = $true; break } } catch { $last = $_.Exception.Message }
  Start-Sleep 5
}
if (-not $ok) { Fail "Web sitesi acilmadi. Son hata: $last" }

$admin = (Select-String -Path ".env" -Pattern '^ADMIN_(EMAIL|PASSWORD)=').Line -join "  "
Log "`nHAZIR!" "Green"
Log "  Site:    http://localhost:3000"
Log "  Swagger: http://localhost:8080/swagger"
Log "  Admin:   $admin"
Log "  Durdurmak icin: durdur.bat"
Start-Process "http://localhost:3000"
Read-Host "`nKapatmak icin Enter"
