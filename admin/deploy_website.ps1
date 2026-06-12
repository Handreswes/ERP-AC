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
    
    $googleXmlPath = Join-Path $sourceDir "google_feed.xml"
    $tiktokXmlPath = Join-Path $sourceDir "tiktok_feed.xml"
    Write-Host "Generating Product Feeds: $googleXmlPath and $tiktokXmlPath" -ForegroundColor Cyan
    
    # Initialize Google/Meta XML Feed
    $googleXml = "<?xml version=`"1.0`"?>`n"
    $googleXml += "<rss xmlns:g=`"http://base.google.com/ns/1.0`" version=`"2.0`">`n"
    $googleXml += "  <channel>`n"
    $googleXml += "    <title>TuCompras Col</title>`n"
    $googleXml += "    <link>https://tucomprascol.com</link>`n"
    $googleXml += "    <description>Distribuidora lider en herramientas y hogar en Colombia</description>`n"
    
    # Initialize TikTok XML Feed
    $tiktokXml = "<?xml version=`"1.0`" encoding=`"UTF-8`"?>`n"
    $tiktokXml += "<rss version=`"2.0`">`n"
    $tiktokXml += "  <channel>`n"
    $tiktokXml += "    <title>TuCompras Col</title>`n"
    $tiktokXml += "    <link>https://tucomprascol.com</link>`n"
    $tiktokXml += "    <description>Distribuidora lider en herramientas y hogar en Colombia</description>`n"
    
    foreach ($p in $products) {
        $price = $p.priceFinal
        if (!$price -or $price -le 0) { $price = $p.priceInternet }
        if (!$price -or $price -le 0) { $price = $p.priceWholesale }
        
        $imgUrl = ""
        if ($p.image) {
            if ($p.image -is [array]) {
                if ($p.image.Count -gt 0) {
                    $imgUrl = $p.image[0]
                }
            } elseif ($p.image -is [string]) {
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
        }
        
        if (!$price -or $price -le 0 -or !$imgUrl) {
            continue
        }

        # Extract base64 image to local file so Google Merchant Center can crawl it
        if ($imgUrl -like "data:image/*;base64,*") {
            try {
                $parts = $imgUrl.Split(",")
                $header = $parts[0]
                $base64Data = $parts[1..($parts.Count - 1)] -join ","
                
                $ext = "jpg"
                if ($header -like "*image/png*") { $ext = "png" }
                elseif ($header -like "*image/gif*") { $ext = "gif" }
                elseif ($header -like "*image/webp*") { $ext = "webp" }
                
                $imagesDir = Join-Path $sourceDir "images\products"
                if (!(Test-Path $imagesDir)) {
                    New-Item -ItemType Directory -Force -Path $imagesDir | Out-Null
                }
                
                $fileName = "$($p.id).$ext"
                $filePath = Join-Path $imagesDir $fileName
                
                $bytes = [System.Convert]::FromBase64String($base64Data.Trim())
                [System.IO.File]::WriteAllBytes($filePath, $bytes)
                $imgUrl = "https://tucomprascol.com/images/products/$fileName"
                Write-Host "Extracted base64 image for product $($p.id) -> images/products/$fileName" -ForegroundColor Gray
            } catch {
                Write-Host "Warning: Failed to save base64 image for product $($p.id): $($_.Exception.Message)" -ForegroundColor Yellow
            }
        }
        
        $stock = 0
        if ($p.stockMillenio) { $stock += [int]$p.stockMillenio }
        if ($p.stockVulcano) { $stock += [int]$p.stockVulcano }
        $g_availability = if ($stock -gt 0) { "in_stock" } else { "out_of_stock" }
        $availability = if ($stock -gt 0) { "in stock" } else { "out of stock" }
        
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
        
        # Add to Google/Meta Feed
        $googleXml += "    <item>`n"
        $googleXml += "      <g:id>$($p.id)</g:id>`n"
        $googleXml += "      <title>$titleEscaped</title>`n"
        $googleXml += "      <description>$descEscaped</description>`n"
        $googleXml += "      <link>https://tucomprascol.com/?p=$($p.id)</link>`n"
        $googleXml += "      <g:image_link>$imgUrl</g:image_link>`n"
        $googleXml += "      <g:condition>new</g:condition>`n"
        $googleXml += "      <g:availability>$g_availability</g:availability>`n"
        $googleXml += "      <g:price>$price COP</g:price>`n"
        $googleXml += "      <g:brand>$brand</g:brand>`n"
        $googleXml += "      <g:google_product_category>Hardware &gt; Tools</g:google_product_category>`n"
        $googleXml += "    </item>`n"

        # Add to TikTok Feed
        $tiktokXml += "    <item>`n"
        $tiktokXml += "      <sku_id>$($p.id)</sku_id>`n"
        $tiktokXml += "      <title>$titleEscaped</title>`n"
        $tiktokXml += "      <description>$descEscaped</description>`n"
        $tiktokXml += "      <link>https://tucomprascol.com/?p=$($p.id)</link>`n"
        $tiktokXml += "      <image_link>$imgUrl</image_link>`n"
        $tiktokXml += "      <condition>new</condition>`n"
        $tiktokXml += "      <availability>$availability</availability>`n"
        $tiktokXml += "      <price>$price COP</price>`n"
        $tiktokXml += "      <brand>$brand</brand>`n"
        $tiktokXml += "      <category>Hardware &gt; Tools</category>`n"
        $tiktokXml += "    </item>`n"
    }
    
    $googleXml += "  </channel>`n"
    $googleXml += "</rss>"
    
    $tiktokXml += "  </channel>`n"
    $tiktokXml += "</rss>"
    
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($googleXmlPath, $googleXml, $utf8NoBom)
    [System.IO.File]::WriteAllText($tiktokXmlPath, $tiktokXml, $utf8NoBom)
    Write-Host "Product Feeds generated successfully!" -ForegroundColor Green
} catch {
    Write-Host "Warning: Failed to generate Product Feeds: $($_.Exception.Message)" -ForegroundColor Yellow
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
