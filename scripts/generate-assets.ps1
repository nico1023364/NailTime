# Generates NailTime branded PNG assets with GDI+ (Windows only).
# Usage: powershell -ExecutionPolicy Bypass -File scripts/generate-assets.ps1

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$assets = Join-Path $root 'assets'
if (-not (Test-Path $assets)) { New-Item -ItemType Directory -Path $assets | Out-Null }

function New-Canvas([int]$width, [int]$height) {
  $bitmap = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  return @($bitmap, $graphics)
}

function New-Gradient([single]$width, [single]$height) {
  $rect = New-Object System.Drawing.RectangleF(0, 0, $width, $height)
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $rect,
    [System.Drawing.ColorTranslator]::FromHtml('#F78BAB'),
    [System.Drawing.ColorTranslator]::FromHtml('#9A2C58'),
    45
  )
  $blend = New-Object System.Drawing.Drawing2D.ColorBlend(3)
  $blend.Colors = @(
    [System.Drawing.ColorTranslator]::FromHtml('#F78BAB'),
    [System.Drawing.ColorTranslator]::FromHtml('#E05A8A'),
    [System.Drawing.ColorTranslator]::FromHtml('#9A2C58')
  )
  $blend.Positions = @(0.0, 0.55, 1.0)
  $brush.InterpolationColors = $blend
  return $brush
}

function Get-RoundedPath([single]$x, [single]$y, [single]$width, [single]$height, [single]$radius) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $diameter = [Math]::Min($radius * 2, [Math]::Min($width, $height))
  $path.AddArc($x, $y, $diameter, $diameter, 180, 90)
  $path.AddArc($x + $width - $diameter, $y, $diameter, $diameter, 270, 90)
  $path.AddArc($x + $width - $diameter, $y + $height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($x, $y + $height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function Fill-RoundedRect($graphics, $brush, [single]$x, [single]$y, [single]$width, [single]$height, [single]$radius) {
  $path = Get-RoundedPath $x $y $width $height $radius
  $graphics.FillPath($brush, $path)
  $path.Dispose()
}

function Draw-Star($graphics, $brush, [single]$cx, [single]$cy, [single]$radius) {
  $inner = $radius * 0.26
  $points = [System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new($cx, $cy - $radius),
    [System.Drawing.PointF]::new($cx + $inner, $cy - $inner),
    [System.Drawing.PointF]::new($cx + $radius, $cy),
    [System.Drawing.PointF]::new($cx + $inner, $cy + $inner),
    [System.Drawing.PointF]::new($cx, $cy + $radius),
    [System.Drawing.PointF]::new($cx - $inner, $cy + $inner),
    [System.Drawing.PointF]::new($cx - $radius, $cy),
    [System.Drawing.PointF]::new($cx - $inner, $cy - $inner)
  )
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddPolygon($points)
  $graphics.FillPath($brush, $path)
  $path.Dispose()
}

function Draw-Bottle($graphics, [single]$centerX, [single]$centerY, [single]$scale, [bool]$monochrome) {
  $state = $graphics.Save()
  $graphics.TranslateTransform($centerX, $centerY)
  $graphics.ScaleTransform($scale, $scale)
  $graphics.TranslateTransform(-512, -512)

  $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  $capPath = Get-RoundedPath 428 238 168 190 40
  $graphics.FillPath($white, $capPath)
  $capPath.Dispose()

  $neckPath = Get-RoundedPath 478 408 68 62 18
  $graphics.FillPath($white, $neckPath)
  $neckPath.Dispose()

  $bodyPath = Get-RoundedPath 346 444 332 386 76
  $graphics.FillPath($white, $bodyPath)
  $bodyPath.Dispose()

  if (-not $monochrome) {
    $accent = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(235, 247, 168, 196))
    $accentPath = Get-RoundedPath 386 484 252 306 54
    $graphics.FillPath($accent, $accentPath)
    $accentPath.Dispose()

    $shine = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(150, 255, 255, 255))
    $shinePath = Get-RoundedPath 404 512 44 216 22
    $graphics.FillPath($shine, $shinePath)
    $shinePath.Dispose()

    $star = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(240, 255, 255, 255))
    Draw-Star $graphics $star 786 268 62
    Draw-Star $graphics $star 700 172 26
    $star.Dispose()

    $accent.Dispose()
    $shine.Dispose()
  }

  $white.Dispose()
  $graphics.Restore($state)
}

function Draw-Circles($graphics, [single]$size) {
  $glow = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(20, 255, 255, 255))
  $graphics.FillEllipse($glow, $size * 0.6, -$size * 0.22, $size * 0.62, $size * 0.62)
  $graphics.FillEllipse($glow, -$size * 0.2, $size * 0.66, $size * 0.55, $size * 0.55)
  $glow.Dispose()
}

function Save-Png($bitmap, [string]$path) {
  $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
}

# ---- App icon (1024) -------------------------------------------------------
$app = New-Canvas 1024 1024
$iconGradient = New-Gradient 1024 1024
$app[1].FillRectangle($iconGradient, 0, 0, 1024, 1024)
Draw-Circles $app[1] 1024
Draw-Bottle $app[1] 512 520 0.84 $false
Save-Png $app[0] (Join-Path $assets 'icon.png')
$iconGradient.Dispose()
$app[0].Dispose()
$app[1].Dispose()

# ---- Android adaptive background ------------------------------------------
$bg = New-Canvas 1024 1024
$bgGradient = New-Gradient 1024 1024
$bg[1].FillRectangle($bgGradient, 0, 0, 1024, 1024)
Draw-Circles $bg[1] 1024
Save-Png $bg[0] (Join-Path $assets 'android-icon-background.png')
$bgGradient.Dispose()
$bg[0].Dispose()
$bg[1].Dispose()

# ---- Android adaptive foreground (transparent, safe zone) ------------------
$fg = New-Canvas 1024 1024
$fg[1].Clear([System.Drawing.Color]::Transparent)
Draw-Bottle $fg[1] 512 512 0.64 $false
Save-Png $fg[0] (Join-Path $assets 'android-icon-foreground.png')
$fg[0].Dispose()
$fg[1].Dispose()

# ---- Android themed monochrome --------------------------------------------
$mono = New-Canvas 1024 1024
$mono[1].Clear([System.Drawing.Color]::Transparent)
Draw-Bottle $mono[1] 512 512 0.64 $true
Save-Png $mono[0] (Join-Path $assets 'android-icon-monochrome.png')
$mono[0].Dispose()
$mono[1].Dispose()

# ---- Splash logo (transparent badge on #FFF9FB) ---------------------------
$splash = New-Canvas 512 512
$splash[1].Clear([System.Drawing.Color]::Transparent)
$badgeGradient = New-Gradient 512 512
Fill-RoundedRect $splash[1] $badgeGradient 76 76 360 360 92
Draw-Circles $splash[1] 512
Draw-Bottle $splash[1] 256 266 0.29 $false
Save-Png $splash[0] (Join-Path $assets 'splash-icon.png')
$badgeGradient.Dispose()
$splash[0].Dispose()
$splash[1].Dispose()

# ---- Favicon (64) ----------------------------------------------------------
$favicon = New-Canvas 64 64
$favGradient = New-Gradient 64 64
$favicon[1].FillRectangle($favGradient, 0, 0, 64, 64)
Draw-Bottle $favicon[1] 32 33 0.052 $false
Save-Png $favicon[0] (Join-Path $assets 'favicon.png')
$favGradient.Dispose()
$favicon[0].Dispose()
$favicon[1].Dispose()

# ---- Android notification icon (white on transparent) ---------------------
$notif = New-Canvas 96 96
$notif[1].Clear([System.Drawing.Color]::Transparent)
Draw-Bottle $notif[1] 48 48 0.062 $true
Save-Png $notif[0] (Join-Path $assets 'notification-icon.png')
$notif[0].Dispose()
$notif[1].Dispose()

Write-Host 'NailTime assets generated in' $assets
