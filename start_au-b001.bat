@echo off

cd /d C:\AU-B001

start "P0 LOCAL RECEIVER" cmd /k node p0\local-receiver.js

start "AU-B001 SERVER" cmd /k node server.js

timeout /t 3 >nul

start "AU-B001 TUNNEL" cmd /k cloudflared.exe tunnel run au-b001