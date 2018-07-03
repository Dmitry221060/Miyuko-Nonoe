@echo off
node utilities\writeLogs.js "Bot was runned at ---- " "run"
:reconect
node index.js
node utilities\writeLogs.js "Bot was crashed at ---- " "crash"
goto reconect
pause