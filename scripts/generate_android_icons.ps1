Add-Type -AssemblyName System.Drawing

$srcPath = "s:\OrgaFlow_Alpha\frontend\static\favicon.png"
if (-not (Test-Path $srcPath)) {
    Write-Error "Source file missing: $srcPath"
    exit 1
}

$srcBmp = [System.Drawing.Bitmap]::FromFile($srcPath)
$resDir = "s:\OrgaFlow_Alpha\frontend\android\app\src\main\res"

function Save-HighQualityPng($bmp, $outPath) {
    $parent = Split-Path -Parent $outPath
    if (-not (Test-Path $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
}

function New-ForegroundIcon($size, $src) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    # Safe zone for adaptive icon foreground is inner 66%
    $targetSize = [int]($size * 0.65)
    $ratio = [Math]::Min($targetSize / $src.Width, $targetSize / $src.Height)
    $w = [int]($src.Width * $ratio)
    $h = [int]($src.Height * $ratio)
    $x = [int](($size - $w) / 2)
    $y = [int](($size - $h) / 2)

    $g.DrawImage($src, $x, $y, $w, $h)
    $g.Dispose()
    return $bmp
}

function New-SquareLauncherIcon($size, $src) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    # Rounded rectangle background with soft shadow
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $radius = [int]($size * 0.22)
    $diameter = $radius * 2
    $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc(0, 0, $diameter, $diameter, 180, 90)
    $path.AddArc($size - $diameter, 0, $diameter, $diameter, 270, 90)
    $path.AddArc($size - $diameter, $size - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc(0, $size - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()

    $g.FillPath($bgBrush, $path)
    $bgBrush.Dispose()

    # Subtle border
    $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(30, 0, 0, 0), 1.0)
    $g.DrawPath($borderPen, $path)
    $borderPen.Dispose()
    $path.Dispose()

    # Draw centered logo inside (75% of size)
    $targetSize = [int]($size * 0.75)
    $ratio = [Math]::Min($targetSize / $src.Width, $targetSize / $src.Height)
    $w = [int]($src.Width * $ratio)
    $h = [int]($src.Height * $ratio)
    $x = [int](($size - $w) / 2)
    $y = [int](($size - $h) / 2)

    $g.DrawImage($src, $x, $y, $w, $h)
    $g.Dispose()
    return $bmp
}

function New-RoundLauncherIcon($size, $src) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $g.FillEllipse($bgBrush, 0, 0, $size, $size)
    $bgBrush.Dispose()

    $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(30, 0, 0, 0), 1.0)
    $g.DrawEllipse($borderPen, 0, 0, $size - 1, $size - 1)
    $borderPen.Dispose()

    # Draw centered logo inside (72% of size)
    $targetSize = [int]($size * 0.72)
    $ratio = [Math]::Min($targetSize / $src.Width, $targetSize / $src.Height)
    $w = [int]($src.Width * $ratio)
    $h = [int]($src.Height * $ratio)
    $x = [int](($size - $w) / 2)
    $y = [int](($size - $h) / 2)

    $g.DrawImage($src, $x, $y, $w, $h)
    $g.Dispose()
    return $bmp
}

function New-SplashImage($w, $h, $src) {
    $bmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Dark background #0f172a
    $darkColor = [System.Drawing.Color]::FromArgb(255, 15, 23, 42)
    $g.Clear($darkColor)

    # Logo centered: around 35% of the shortest screen dimension
    $minDim = [Math]::Min($w, $h)
    $targetSize = [int]($minDim * 0.40)
    if ($targetSize -lt 96) { $targetSize = 96 }
    $ratio = [Math]::Min($targetSize / $src.Width, $targetSize / $src.Height)
    $lw = [int]($src.Width * $ratio)
    $lh = [int]($src.Height * $ratio)
    $lx = [int](($w - $lw) / 2)
    $ly = [int](($h - $lh) / 2)

    $g.DrawImage($src, $lx, $ly, $lw, $lh)
    $g.Dispose()
    return $bmp
}

# 1. Launcher Mipmaps (Foregound, Square, Round)
$densities = @{
    "mdpi"    = @{ Icon = 48;  Fg = 108 }
    "hdpi"    = @{ Icon = 72;  Fg = 162 }
    "xhdpi"   = @{ Icon = 96;  Fg = 216 }
    "xxhdpi"  = @{ Icon = 144; Fg = 324 }
    "xxxhdpi" = @{ Icon = 192; Fg = 432 }
}

foreach ($d in $densities.Keys) {
    $cfg = $densities[$d]
    $dir = Join-Path $resDir "mipmap-$d"

    # Foreground
    $fgBmp = New-ForegroundIcon $cfg.Fg $srcBmp
    Save-HighQualityPng $fgBmp (Join-Path $dir "ic_launcher_foreground.png")
    $fgBmp.Dispose()

    # Square Icon
    $sqBmp = New-SquareLauncherIcon $cfg.Icon $srcBmp
    Save-HighQualityPng $sqBmp (Join-Path $dir "ic_launcher.png")
    $sqBmp.Dispose()

    # Round Icon
    $rdBmp = New-RoundLauncherIcon $cfg.Icon $srcBmp
    Save-HighQualityPng $rdBmp (Join-Path $dir "ic_launcher_round.png")
    $rdBmp.Dispose()

    Write-Output "Generated mipmap-$($d): Icon=$($cfg.Icon)x$($cfg.Icon), Fg=$($cfg.Fg)x$($cfg.Fg)"
}

# 2. Splash Drawables
$splashes = @(
    @{ Dir = "drawable"; W = 480; H = 800 }
    @{ Dir = "drawable-port-mdpi"; W = 320; H = 480 }
    @{ Dir = "drawable-port-hdpi"; W = 480; H = 800 }
    @{ Dir = "drawable-port-xhdpi"; W = 720; H = 1280 }
    @{ Dir = "drawable-port-xxhdpi"; W = 960; H = 1600 }
    @{ Dir = "drawable-port-xxxhdpi"; W = 1280; H = 1920 }
    @{ Dir = "drawable-land-mdpi"; W = 480; H = 320 }
    @{ Dir = "drawable-land-hdpi"; W = 800; H = 480 }
    @{ Dir = "drawable-land-xhdpi"; W = 1280; H = 720 }
    @{ Dir = "drawable-land-xxhdpi"; W = 1600; H = 960 }
    @{ Dir = "drawable-land-xxxhdpi"; W = 1920; H = 1280 }
)

foreach ($s in $splashes) {
    $dir = Join-Path $resDir $s.Dir
    $spBmp = New-SplashImage $s.W $s.H $srcBmp
    Save-HighQualityPng $spBmp (Join-Path $dir "splash.png")
    $spBmp.Dispose()
    Write-Output "Generated splash for $($s.Dir): $($s.W)x$($s.H)"
}

# 3. Clean up obsolete vector ic_launcher_foreground.xml in drawable-v24 if present
$obsoleteVector = "s:\OrgaFlow_Alpha\frontend\android\app\src\main\res\drawable-v24\ic_launcher_foreground.xml"
if (Test-Path $obsoleteVector) {
    Remove-Item $obsoleteVector -Force
    Write-Output "Removed obsolete Capacitor vector: $obsoleteVector"
}

$srcBmp.Dispose()
Write-Output "All Android icons and splashes successfully generated!"
