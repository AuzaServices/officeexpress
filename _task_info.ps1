$r = Select-String -Path 'server.js' -Pattern 'app\.delete' -AllMatches
foreach ($m in $r) { Write-Output ("{0}: {1}" -f $m.LineNumber, $m.Line.Trim()) }
