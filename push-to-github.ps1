# Push to GitHub for Render Deployment

Write-Host "🚀 Preparing code for Render deployment..." -ForegroundColor Cyan

# Check if git is initialized
if (-not (Test-Path ".git")) {
    Write-Host "📦 Initializing git repository..." -ForegroundColor Yellow
    git init
    git branch -M main
}

# Add all files
Write-Host "📝 Adding files..." -ForegroundColor Yellow
git add .

# Commit
Write-Host "💾 Creating commit..." -ForegroundColor Yellow
git commit -m "Ready for Render deployment - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"

# Check if remote exists
$remoteUrl = git remote get-url origin 2>$null
if ($remoteUrl) {
    Write-Host "✅ Remote already configured: $remoteUrl" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "⚠️  No git remote found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please create a GitHub repository and run:" -ForegroundColor Yellow
    Write-Host "  git remote add origin https://github.com/YOUR_USERNAME/twitch-minecraft-backend.git" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Push to GitHub
Write-Host "🚀 Pushing to GitHub..." -ForegroundColor Yellow
git push -u origin main

Write-Host ""
Write-Host "✅ Code pushed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Go to https://render.com/" -ForegroundColor White
Write-Host "2. Sign up/Login with GitHub" -ForegroundColor White
Write-Host "3. Follow instructions in RENDER_DEPLOYMENT.md" -ForegroundColor White
Write-Host ""
