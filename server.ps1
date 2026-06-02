$ErrorActionPreference = "Stop"

$root = (Get-Location).Path
$port = if ($env:PORT) { [int]$env:PORT } else { 4173 }
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
$listener.Start()

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".png"  = "image/png"
    ".gif"  = "image/gif"
    ".svg"  = "image/svg+xml"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "text/javascript; charset=utf-8"
    ".mp4"  = "video/mp4"
    ".pdf"  = "application/pdf"
}

Write-Output "YUSU STUDIO preview: http://127.0.0.1:$port"

while ($true) {
    $client = $listener.AcceptTcpClient()
    $stream = $client.GetStream()
    $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
    $requestLine = $reader.ReadLine()
    while ($reader.ReadLine()) {}

    $requestPath = if ($requestLine) { ($requestLine -split " ")[1] } else { "/" }
    $relativePath = [Uri]::UnescapeDataString(($requestPath -split "\?")[0].TrimStart("/"))
    if ([string]::IsNullOrWhiteSpace($relativePath)) {
        $relativePath = "index.html"
    }

    $filePath = [System.IO.Path]::GetFullPath((Join-Path $root $relativePath))
    if (-not $filePath.StartsWith($root) -or -not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
        $body = [System.Text.Encoding]::UTF8.GetBytes("Not found")
        $header = [System.Text.Encoding]::ASCII.GetBytes("HTTP/1.1 404 Not Found`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n")
        $stream.Write($header, 0, $header.Length)
        $stream.Write($body, 0, $body.Length)
        $client.Close()
        continue
    }

    $extension = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
    $contentType = if ($mimeTypes.ContainsKey($extension)) {
        $mimeTypes[$extension]
    } else {
        "application/octet-stream"
    }

    $bytes = [System.IO.File]::ReadAllBytes($filePath)
    $header = [System.Text.Encoding]::ASCII.GetBytes("HTTP/1.1 200 OK`r`nContent-Type: $contentType`r`nContent-Length: $($bytes.Length)`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n")
    $stream.Write($header, 0, $header.Length)
    $stream.Write($bytes, 0, $bytes.Length)
    $client.Close()
}
