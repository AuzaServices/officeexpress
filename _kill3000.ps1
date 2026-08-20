$conns = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($conns) {
  foreach ($c in $conns) {
    $pid2 = $c.OwningProcess
    Write-Output ("Matando PID " + $pid2)
    Stop-Process -Id $pid2 -Force -ErrorAction SilentlyContinue
  }
} else {
  Write-Output "Nenhum processo na porta 3000"
}
Start-Sleep -Seconds 1
Write-Output "Verificando..."
$conns2 = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($conns2) { Write-Output "AINDA OCUPADA" } else { Write-Output "PORTA LIBERADA" }
