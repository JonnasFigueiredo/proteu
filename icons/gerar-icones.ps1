# Gera os ícones do Proteu QA (joaninha — o "bug" do QA) nos tamanhos do
# manifest. Rode com: powershell -File icons/gerar-icones.ps1
Add-Type -AssemblyName System.Drawing

function New-RoundedRect([single]$x,[single]$y,[single]$w,[single]$h,[single]$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

function Draw-Ladybug([int]$S, [string]$out) {
  $bmp = New-Object System.Drawing.Bitmap($S, $S)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.PixelOffsetMode = 'HighQuality'

  # fundo: quadrado arredondado com gradiente azul (marca)
  $rect = New-RoundedRect 0 0 $S $S ($S * 0.22)
  $c1 = [System.Drawing.Color]::FromArgb(255, 30, 136, 229)
  $c2 = [System.Drawing.Color]::FromArgb(255, 13, 71, 161)
  $grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point(0,0)),
    (New-Object System.Drawing.Point(0,$S)), $c1, $c2)
  $g.FillPath($grad, $rect)

  $black = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 26, 26, 26))
  $red   = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 229, 57, 53))
  $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  $penBlack = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255,26,26,26), [single]($S*0.045))
  $penBlack.StartCap = 'Round'; $penBlack.EndCap = 'Round'

  $cx = $S * 0.5; $cy = $S * 0.57; $rx = $S * 0.30; $ry = $S * 0.33

  # pernas (atrás do corpo)
  $legLen = $S * 0.13
  foreach ($fy in @(-0.35, 0.0, 0.35)) {
    $y0 = $cy + $ry * $fy
    $g.DrawLine($penBlack, [single]($cx - $rx*0.65), [single]$y0, [single]($cx - $rx - $legLen), [single]($y0 + $S*0.05))
    $g.DrawLine($penBlack, [single]($cx + $rx*0.65), [single]$y0, [single]($cx + $rx + $legLen), [single]($y0 + $S*0.05))
  }

  # antenas
  $penThin = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255,26,26,26), [single]($S*0.035))
  $penThin.StartCap = 'Round'; $penThin.EndCap = 'Round'
  $headY = $cy - $ry * 0.92
  $g.DrawLine($penThin, [single]($cx - $S*0.07), [single]$headY, [single]($cx - $S*0.16), [single]($headY - $S*0.12))
  $g.DrawLine($penThin, [single]($cx + $S*0.07), [single]$headY, [single]($cx + $S*0.16), [single]($headY - $S*0.12))
  $ad = $S*0.07
  $g.FillEllipse($black, [single]($cx - $S*0.16 - $ad/2), [single]($headY - $S*0.12 - $ad/2), [single]$ad, [single]$ad)
  $g.FillEllipse($black, [single]($cx + $S*0.16 - $ad/2), [single]($headY - $S*0.12 - $ad/2), [single]$ad, [single]$ad)

  # contorno branco do corpo (separa do azul)
  $ol = $S * 0.035
  $g.FillEllipse($white, [single]($cx-$rx-$ol), [single]($cy-$ry-$ol), [single](2*$rx+2*$ol), [single](2*$ry+2*$ol))

  # corpo vermelho
  $g.FillEllipse($red, [single]($cx-$rx), [single]($cy-$ry), [single](2*$rx), [single](2*$ry))

  # cabeça preta (topo)
  $hw = $S * 0.30; $hh = $S * 0.24
  $hcy = $cy - $ry + $hh*0.32
  $g.FillEllipse($black, [single]($cx-$hw/2), [single]($hcy-$hh/2), [single]$hw, [single]$hh)

  # linha central
  $penSplit = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255,26,26,26), [single]($S*0.05))
  $g.DrawLine($penSplit, [single]$cx, [single]($hcy), [single]$cx, [single]($cy+$ry*0.92))

  # pintas
  $sr = $S * 0.075
  foreach ($sp in @(@(-0.45,-0.12), @(0.45,-0.12), @(-0.4,0.42), @(0.4,0.42))) {
    $sxp = $cx + $rx * $sp[0]; $syp = $cy + $ry * $sp[1]
    $g.FillEllipse($black, [single]($sxp-$sr), [single]($syp-$sr), [single](2*$sr), [single](2*$sr))
  }

  # brilho
  $gl = $S * 0.10
  $glossBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(120, 255, 255, 255))
  $g.FillEllipse($glossBrush, [single]($cx-$rx*0.55), [single]($cy-$ry*0.55), [single]$gl, [single]($gl*0.7))

  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

foreach ($s in 16,32,48,128) { Draw-Ladybug $s (Join-Path $PSScriptRoot "$s.png") }
Write-Output "Ícones gerados em $PSScriptRoot"
