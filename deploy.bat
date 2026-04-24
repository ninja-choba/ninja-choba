@echo off
chcp 65001 > nul
title 忍者帳場AI デプロイ

echo.
echo  ====================================
echo   忍者帳場AI - 自動デプロイ
echo  ====================================
echo.

set PROJECT_DIR=%USERPROFILE%\Downloads\ninja-choba
set HTML_FILE=%USERPROFILE%\Downloads\ninja_choba_v7.html

if not exist "%PROJECT_DIR%" (
  echo [エラー] ninja-chobaフォルダが見つかりません
  echo 場所: %PROJECT_DIR%
  pause & exit /b 1
)
if not exist "%HTML_FILE%" (
  echo [エラー] HTMLファイルが見つかりません
  echo チャットからninja_choba_v7.htmlをダウンロードしてください
  pause & exit /b 1
)

echo [1/4] HTMLをコピー中...
copy /Y "%HTML_FILE%" "%PROJECT_DIR%\public\index.html" > nul
echo       完了

echo [2/4] Gitにコミット中...
cd /d "%PROJECT_DIR%"
git add . > nul 2>&1
git commit -m "update %DATE% %TIME%" > nul 2>&1
echo       完了

echo [3/4] GitHubにプッシュ中...
git push > nul 2>&1
echo       完了

echo [4/4] Vercelにデプロイ中...
call vercel --prod --yes
if %errorlevel% neq 0 (
  echo [エラー] デプロイに失敗しました
  pause & exit /b 1
)

echo.
echo  ====================================
echo   完了！ https://ninja-choba.jp
echo  ====================================
echo.
start https://ninja-choba.jp
timeout /t 3 > nul
