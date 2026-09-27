param(
  [Parameter(Mandatory=$true)][string]$Toolchain,
  [string]$SigningDir = "$env:LOCALAPPDATA\BaizeShuihuSigning",
  [string]$OutputDir = ""
)
$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
if (!$OutputDir) { $OutputDir = Join-Path $project 'artifacts\android' }
function Find-Tool([string]$file) {
  $found = Get-ChildItem -LiteralPath $Toolchain -Recurse -File -Filter $file | Select-Object -First 1
  if (!$found) { throw "工具目录缺少 $file" }; return $found.FullName
}
function Run([string]$program, [string[]]$arguments) {
  & $program @arguments
  if ($LASTEXITCODE -ne 0) { throw "构建步骤失败：$program ($LASTEXITCODE)" }
}
$java = Find-Tool 'java.exe'
$javac = Find-Tool 'javac.exe'
$jar = Find-Tool 'jar.exe'
$keytool = Find-Tool 'keytool.exe'
$androidJar = Find-Tool 'android.jar'
$aapt = Find-Tool 'aapt2.exe'
$align = Find-Tool 'zipalign.exe'
$d8 = Find-Tool 'd8.jar'
$signer = Find-Tool 'apksigner.jar'
$build = Join-Path $PSScriptRoot ('.build\' + [Guid]::NewGuid().ToString('N'))
$classes = Join-Path $build 'classes'
$dex = Join-Path $build 'dex'
$assets = Join-Path $build 'assets'
New-Item -ItemType Directory -Force -Path $classes,$dex,$assets,$SigningDir,$OutputDir | Out-Null
Copy-Item -LiteralPath (Join-Path $project 'public\game') -Destination $assets -Recurse
# Include only the public game, never cloud code, source secrets or user saves.
$keystore = Join-Path $SigningDir 'baize-shuihu.p12'
$password = Join-Path $SigningDir 'signing-password.txt'
if ((Test-Path $keystore) -and !(Test-Path $password)) { throw '签名密钥已存在但密码文件缺失，请恢复原密码，不能更换密钥。' }
if (!(Test-Path $keystore)) {
  if (Test-Path $password) { throw '签名密码已存在但密钥缺失，请先确认原密钥是否需要恢复。' }
  $bytes = New-Object byte[] 32
  $random = [Security.Cryptography.RandomNumberGenerator]::Create()
  $random.GetBytes($bytes); $random.Dispose()
  [IO.File]::WriteAllText($password,[Convert]::ToBase64String($bytes))
  Run $keytool @('-genkeypair','-keystore',$keystore,'-storetype','PKCS12','-storepass:file',$password,'-alias','baize-shuihu','-keyalg','RSA','-keysize','3072','-sigalg','SHA256withRSA','-validity','10000','-dname','CN=Baize Shuihu, O=Baize, C=CN')
}
$compiled = Join-Path $build 'resources.zip'
$unsigned = Join-Path $build 'unsigned.apk'
$aligned = Join-Path $build 'aligned.apk'
Run $aapt @('compile','--dir',(Join-Path $PSScriptRoot 'res'),'-o',$compiled)
Run $aapt @('link','-o',$unsigned,'-I',$androidJar,'--manifest',(Join-Path $PSScriptRoot 'AndroidManifest.xml'),'-A',$assets,$compiled)
$sources = @(Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot 'src') -Recurse -Filter '*.java' | ForEach-Object {$_.FullName})
Run $javac (@('-encoding','UTF-8','--release','8','-classpath',$androidJar,'-d',$classes) + $sources)
$classJar = Join-Path $build 'classes.jar'
Run $jar @('cf',$classJar,'-C',$classes,'.')
Run $java @('-cp',$d8,'com.android.tools.r8.D8','--lib',$androidJar,'--min-api','26','--output',$dex,$classJar)
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::Open($unsigned,[IO.Compression.ZipArchiveMode]::Update)
try { Get-ChildItem -LiteralPath $dex -Filter '*.dex' | ForEach-Object { [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip,$_.FullName,$_.Name,[IO.Compression.CompressionLevel]::Optimal) | Out-Null } 
  # Some Windows aapt2 builds emit backslashes in asset entry names. AssetManager requires '/'.
  foreach ($entry in @($zip.Entries | Where-Object { $_.FullName.Contains('\') })) {
    $name = $entry.FullName.Replace('\','/')
    $memory = New-Object IO.MemoryStream
    $inputStream = $entry.Open()
    try { $inputStream.CopyTo($memory) } finally { $inputStream.Dispose() }
    $entry.Delete()
    $replacement = $zip.CreateEntry($name,[IO.Compression.CompressionLevel]::Optimal)
    $outputStream = $replacement.Open()
    try { $memory.Position=0; $memory.CopyTo($outputStream) } finally { $outputStream.Dispose(); $memory.Dispose() }
  }
} finally { $zip.Dispose() }
Run $align @('-f','-p','4',$unsigned,$aligned)
$release = (Get-Content -LiteralPath (Join-Path $project 'public\game\data\config.json') -Raw | ConvertFrom-Json).release
$apk = Join-Path $OutputDir "baize-shuihu-$release.apk"
Run $java @('-jar',$signer,'sign','--ks',$keystore,'--ks-key-alias','baize-shuihu','--ks-pass',"file:$password",'--out',$apk,$aligned)
Run $java @('-jar',$signer,'verify','--verbose',$apk)
Run $aapt @('dump','badging',$apk)
$hash = (Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash.ToLowerInvariant()
[IO.File]::WriteAllText("$apk.sha256",$hash + '  ' + [IO.Path]::GetFileName($apk) + [Environment]::NewLine)
Write-Output "APK: $apk"
Write-Output "签名密钥备份目录（勿上传 GitHub）: $SigningDir"
