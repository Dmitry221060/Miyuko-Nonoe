@echo off
SetLocal EnableExtensions EnableDelayedExpansion

For /F "Delims=" %%I In ('wmic process get name') Do Set V=%%~I !V!
echo %V%
