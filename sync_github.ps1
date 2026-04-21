# Load environment variables from .env file
$envPath = Join-Path $PSScriptRoot ".env"
if (Test-Path $envPath) {
    Get-Content $envPath | Where-Object { $_ -match "=" -and $_ -notmatch "^#" } | ForEach-Object {
        $name, $value = $_.Split('=', 2)
        Set-Variable -Name $name.Trim() -Value $value.Trim() -Scope Script
    }
}
else {
    Write-Host "Error: .env file not found!" -ForegroundColor Red
    exit
}

$token = $GITHUB_TOKEN
$owner = $GITHUB_OWNER
$repo = $GITHUB_REPO
$baseDir = $PSScriptRoot
$headers = @{
    Authorization = "token $token"
    Accept        = "application/vnd.github.v3+json"
}

$files = Get-ChildItem -Path $baseDir -File -Recurse

foreach ($file in $files) {
    $relativePath = $file.FullName.Replace($baseDir + "\", "").Replace("\", "/")
    Write-Host "Processing: $relativePath"
    
    $url = "https://api.github.com/repos/$owner/$repo/contents/$relativePath"
    
    # 1. Get SHA if exists
    $sha = $null
    try {
        $existing = Invoke-RestMethod -Uri $url -Headers $headers -Method Get -ErrorAction Stop
        $sha = $existing.sha
    }
    catch {
        # File doesn't exist, which is fine
    }
    
    # 2. Prepare Payload
    $content = [System.IO.File]::ReadAllBytes($file.FullName)
    $base64Content = [System.Convert]::ToBase64String($content)
    
    $body = @{
        message = "Final Sync V68: $relativePath"
        content = $base64Content
    }
    if ($sha) { $body.sha = $sha }
    
    $jsonBody = $body | ConvertTo-Json
    
    # 3. Push to GitHub
    try {
        Invoke-RestMethod -Uri $url -Headers $headers -Method Put -Body $jsonBody -ContentType "application/json" -ErrorAction Stop
        Write-Host "Successfully synced: $relativePath"
    }
    catch {
        Write-Host "Failed to sync $($relativePath): $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nSincronización finalizada. Presiona cualquier tecla para cerrar esta ventana..." -ForegroundColor Cyan
Read-Host
