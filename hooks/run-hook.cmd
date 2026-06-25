@echo off
:: Windows wrapper for session-start (uses PowerShell)
powershell -ExecutionPolicy Bypass -File "%~dp0session-start"
