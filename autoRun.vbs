Set oShell = CreateObject ("Wscript.Shell") 
Dim Arg
Arg = "cmd /c run.bat"
oShell.Run Arg, 0, false