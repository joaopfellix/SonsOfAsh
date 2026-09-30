Set shell = CreateObject("WScript.Shell")

shell.Run "cmd /c cd /d C:\Users\Usuario\SonsOfAsh && node server.js", 0, False

WScript.Sleep 5000

shell.Run "http://localhost:5500", 1, False