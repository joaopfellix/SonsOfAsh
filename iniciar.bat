@echo off
title Sons.Of.Ash
cd /d C:\Users\Usuario\SonsOfAsh

timeout /t 3 /nobreak >nul

start "" node server.js

timeout /t 3 /nobreak >nul

start "" http://localhost:5500