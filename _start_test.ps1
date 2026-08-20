# Inicia o servidor atualizado e testa as rotas.
taskkill /PID 13196 /F 2>$null
Start-Sleep -Seconds 1
$proc = Start-Process -FilePath node -ArgumentList 'server.js' -WorkingDirectory 'C:\Users\andri\OneDrive\Desktop\Sites\OfficeExpress' -RedirectStandardOutput 'server_test.log' -RedirectStandardError 'server_test.err.log' -NoNewWindow -PassThru
Write-Output ("Servidor PID: " + $proc.Id)
Start-Sleep -Seconds 5
$r = Invoke-WebRequest -Uri 'http://localhost:3000/curriculo-render.js' -UseBasicParsing -TimeoutSec 10
Write-Output ("curriculo-render.js status: " + $r.StatusCode)
Write-Output ("tem gerarHTML: " + $r.Content.Contains('gerarHTML'))
Write-Output ("tem window.renderCurriculo: " + $r.Content.Contains('window.renderCurriculo'))
