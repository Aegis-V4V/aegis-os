$source = "data/podcastindex_feeds.db"
$dest = "aewoodyard@192.168.0.176:~/aegis-os/data/"
$maxRetries = 50
$retryCount = 0

Write-Host "--- AEGIS BRAIN MIGRATION START ---"
Write-Host "Source: $source"
Write-Host "Destination: $dest"

while ($retryCount -lt $maxRetries) {
    Write-Host "Attempt $($retryCount + 1)..."
    scp $source $dest
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "--- MIGRATION COMPLETE! ---"
        break
    } else {
        $retryCount++
        Write-Host "Connection dropped. Retrying in 30 seconds..."
        Start-Sleep -Seconds 30
    }
}

if ($retryCount -eq $maxRetries) {
    Write-Host "--- MIGRATION FAILED after maximum retries. ---"
}
