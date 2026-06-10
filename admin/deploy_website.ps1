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
$remotePathPrefix = "" # Empty for root directory

$headers = @{
    Authorization = "token $token"
    Accept        = "application/vnd.github.v3+json"
}
# ==========================================
# GENERATE GOOGLE MERCHANT PRODUCT FEED (XML)
# ==========================================
$supabaseHeaders = @{
    "apikey" = $env:SUPABASE_KEY
    "Authorization" = "Bearer $env:SUPABASE_KEY"
}
$supabaseUrl = "$($env:SUPABASE_URL)/rest/v1/products?active=eq.true&select=*"
try {
    Write-Host "Fetching products from Supabase to generate feed..." -ForegroundColor Cyan
    $products = Invoke-RestMethod -Uri $supabaseUrl -Headers $supabaseHeaders -Method Get
    
    $xmlPath = Join-Path $sourceDir "google_feed.xml"
    Write-Host "Generating Google Merchant Product Feed: $xmlPath" -ForegroundColor Cyan
    
    $xml = "<?xml version=`"1.0`"?>`n"
    $xml += "<rss xmlns:g=`"http://base.google.com/ns/1.0`" version=`"2.0`">`n"
    $xml += "  <channel>`n"
    $xml += "    <title>TuCompras Col</title>`n"
    $xml += "    <link>https://tucomprascol.com</link>`n"
    $xml += "    <description>Distribuidora líder en herramientas y hogar en Colombia</description>`n"
    
    foreach ($p in $products) {
        $price = $p.priceFinal
        if (!$price -or $price -le 0) { $price = $p.priceInternet }
        if (!$price -or $price -le 0) { $price = $p.priceWholesale }
        
        $imgUrl = ""
        if ($p.image) {
            try {
                $images = $p.image | ConvertFrom-Json
                if ($images -is [array] -and $images.Count -gt 0) {
                    $imgUrl = $images[0]
                } elseif ($images -is [string]) {
                    $imgUrl = $images
                }
            } catch {
                $imgUrl = $p.image
            }
        }
        
        if (!$price -or $price -le 0 -or !$imgUrl) {
            continue
        }
        
        $stock = 0
        if ($p.stockMillenio) { $stock += [int]$p.stockMillenio }
        if ($p.stockVulcano) { $stock += [int]$p.stockVulcano }
        $availability = if ($stock -gt 0) { "in_stock" } else { "out_of_stock" }
        
        $desc = $p.description
        if ($desc) {
            $parts = $desc.Split("[CATALOGO]")
            $desc = $parts[0].Trim()
        }
        if (!$desc) {
            $desc = "Calidad y rendimiento profesional para tu hogar o taller. Compra seguro con pago contra entrega."
        }
        
        $titleEscaped = [System.Security.SecurityElement]::Escape($p.name)
        $descEscaped = [System.Security.SecurityElement]::Escape($desc)
        $categoryEscaped = if ($p.category) { [System.Security.SecurityElement]::Escape($p.category) } else { "General" }
        $brand = if ($p.provider) { [System.Security.SecurityElement]::Escape($p.provider) } else { "TuCompras" }
        
        $xml += "    <item>`n"
        $xml += "      <g:id>$($p.id)</g:id>`n"
        $xml += "      <g:title>$titleEscaped</g:title>`n"
        $xml += "      <g:description>$descEscaped</g:description>`n"
        $xml += "      <g:link>https://tucomprascol.com/#product?id=$($p.id)</g:link>`n"
        $xml += "      <g:image_link>$imgUrl</g:image_link>`n"
        $xml += "      <g:condition>new</g:condition>`n"
        $xml += "      <g:availability>$availability</g:availability>`n"
        $xml += "      <g:price>$price COP</g:price>`n"
        $xml += "      <g:brand>$brand</g:brand>`n"
        $xml += "      <g:google_product_category>Hardware &gt; Tools</g:google_product_category>`n"
        $xml += "    </item>`n"
    }
    
    $xml += "  </channel>`n"
    $xml += "</rss>"
    
    [System.IO.File]::WriteAllText($xmlPath, $xml, [System.Text.Encoding]::UTF8)
    Write-Host "Product Feed generated successfully!" -ForegroundColor Green
} catch {
    Write-Host "Warning: Failed to generate Google Product Feed: $($_.Exception.Message)" -ForegroundColor Yellow
}

$files = Get-ChildItem -Path $sourceDir -File -Recurse

foreach ($file in $files) {
    $relativePath = $file.FullName.Substring($sourceDir.Length).TrimStart("\").Replace("\", "/")
    $githubPath = if ($remotePathPrefix) { "$remotePathPrefix/$relativePath" } else { $relativePath }
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
$displayPath = if ($remotePathPrefix) { "$remotePathPrefix/index.html" } else { "index.html" }
Write-Host "Base URL: https://$owner.github.io/$repo/$displayPath" -ForegroundColor Yellow
