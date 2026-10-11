# Abre el libro en Word, recalcula el índice y los números de página, lo guarda y
# exporta el PDF con marcadores por título. Necesita Word instalado.
#
#   pwsh docs/EntregaFinal/fuente/exportar.ps1

$ErrorActionPreference = 'Stop'
$carpeta = Split-Path -Parent $PSScriptRoot
$docx = Join-Path $carpeta 'La-Juanita-Studio-Entrega-Final.docx'
$pdf = Join-Path $carpeta 'La-Juanita-Studio-Entrega-Final.pdf'

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
    $doc = $word.Documents.Open($docx)
    $doc.Repaginate()
    foreach ($toc in $doc.TablesOfContents) { $toc.Update() }
    $doc.Fields.Update() | Out-Null
    $doc.Repaginate()
    foreach ($toc in $doc.TablesOfContents) { $toc.UpdatePageNumbers() }
    $doc.Save()
    # 17 = PDF · 0 = calidad de impresión · 1 = marcadores desde los títulos
    $doc.ExportAsFixedFormat($pdf, 17, $false, 0, 0, 1, 1, 0, $true, $true, 1)
    "{0} páginas → {1}" -f $doc.ComputeStatistics(2), $pdf
    $doc.Close()
}
finally {
    $word.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
