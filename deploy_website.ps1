# Load environment variables from ERP AC .env
$envPath = "c:\Users\ANDRES\OneDrive\Desktop\PROYECTOS ANTIGRAVITY\ERP AC\.env"
if (Test-Path $envPath) {
    Get-Content $envPath | Where-Object { $_ -match "=" -and $_ -notmatch "^#" } | ForEach-Object {
        $name, $value = $_.Split('=', 2)
        [System.Environment]::SetEnvironmentVariable($name.Trim(), $value.Trim())
    }
}
else {
    Write-Host "Error: .env not found" -ForegroundColor Red; exit
}

$token = $env:GITHUB_TOKEN
$owner = $env:GITHUB_OWNER
$repo = $env:GITHUB_REPO
$sourceDir = "c:\Users\ANDRES\OneDrive\Desktop\PROYECTOS ANTIGRAVITY\ERP AC Website"
$remotePathPrefix = "website" # All web files will go here

$headers = @{
    Authorization = "token $token"
    Accept        = "application/vnd.github.v3+json"
}

$files = Get-ChildItem -Path $sourceDir -File -Recurse

foreach ($file in $files) {
    $relativePath = $file.FullName.Substring($sourceDir.Length).TrimStart("\").Replace("\", "/")
    $githubPath = "$remotePathPrefix/$relativePath"
    Write-Host "Syncing to GitHub: $githubPath"
    
    $url = "https://api.github.com/repos/$owner/$repo/contents/$githubPath"
    
    # 1. Get SHA if exists to update
    $sha = $null
    try {
        $existing = Invoke-RestMethod -Uri $url -Headers $headers -Method Get -ErrorAction Stop
        $sha = $existing.sha
    }
    catch {}
    
    # 2. Prepare Payload
    $content = [System.IO.File]::ReadAllBytes($file.FullName)
    $base64Content = [System.Convert]::ToBase64String($content)
    
    $body = @{
        message = "Website Update: $relativePath"
        content = $base64Content
    }
    if ($sha) { $body.sha = $sha }
    
    $jsonBody = $body | ConvertTo-Json
    
    # 3. Push
    try {
        Invoke-RestMethod -Uri $url -Headers $headers -Method Put -Body $jsonBody -ContentType "application/json" -ErrorAction Stop
        Write-Host "Success: $githubPath" -ForegroundColor Green
    }
    catch {
        Write-Host "Failed: $githubPath - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nDeployment Complete!" -ForegroundColor Cyan
Write-Host "Base URL: https://$owner.github.io/$repo/$remotePathPrefix/index.html" -ForegroundColor Yellow
