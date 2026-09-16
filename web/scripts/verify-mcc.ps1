$ErrorActionPreference = 'Stop'
$temporaryFile = Join-Path ([System.IO.Path]::GetTempPath()) ('cap-mcc-' + [guid]::NewGuid() + '.html')
try {
    Invoke-WebRequest -Uri 'https://www.lords.org/mcc/the-laws' -OutFile $temporaryFile -TimeoutSec 30
    & node (Join-Path $PSScriptRoot 'verify-mcc.mjs') --index-file $temporaryFile --discover-only
    if ($LASTEXITCODE -ne 0) { throw 'Official Law link extraction failed.' }
    $manifestPath = Join-Path $PSScriptRoot '../src/data/mcc-links.json'
    $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
    $destinations = @($manifest.links.PSObject.Properties.Value) + 'https://www.lords.org/mcc/the-laws/preamble-to-the-laws-spirit-of-cricket'
    foreach ($destination in $destinations) {
        $response = Invoke-WebRequest -Uri $destination -TimeoutSec 30
        if ($response.StatusCode -ne 200 -or $response.Content -notmatch 'THE LAW') { throw "Unexpected MCC response: $destination" }
    }
    $manifest.checkedAt = [DateTime]::UtcNow.ToString('o')
    $manifest | ConvertTo-Json -Depth 5 | Set-Content -Path $manifestPath -Encoding utf8
    Write-Output 'Verified 43 official destinations: the Preamble and all 42 Laws.'
} finally {
    if (Test-Path $temporaryFile) { Remove-Item $temporaryFile }
}