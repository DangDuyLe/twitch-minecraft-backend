# 🚀 Deploy Backend to Render

## Bước 1: Chuẩn bị GitHub Repository

### 1.1 Push code lên GitHub
```bash
cd "twitch-stream-plugin"
git init
git add .
git commit -m "Initial commit - ready for Render deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/twitch-minecraft-backend.git
git push -u origin main
```

---

## Bước 2: Deploy trên Render

### 2.1 Tạo tài khoản
1. Vào https://render.com/
2. Sign up với GitHub account
3. Authorize Render truy cập repositories

### 2.2 Tạo PostgreSQL Database
1. Click **"New +"** → **"PostgreSQL"**
2. Name: `twitch-minecraft-db`
3. Database: `twitch_minecraft`
4. User: `twitch_user`
5. Region: **Oregon (US West)** (free tier)
6. Plan: **Free**
7. Click **"Create Database"**
8. **Đợi 2-3 phút** database khởi tạo

### 2.3 Deploy Backend Service
1. Click **"New +"** → **"Web Service"**
2. Connect GitHub repository: `twitch-minecraft-backend`
3. Name: `twitch-minecraft-backend`
4. Region: **Oregon (US West)**
5. Branch: `main`
6. Runtime: **Node**
7. Build Command: `cd twitch-server && npm install`
8. Start Command: `cd twitch-server && npm start`
9. Plan: **Free**

### 2.4 Thêm Environment Variables
Trong service settings, thêm:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `DATABASE_URL` | Chọn **"Add from Database"** → Select `twitch-minecraft-db` |
| `CALLBACK_URL` | `https://twitch-minecraft-backend.onrender.com` (update sau) |
| `SKIP_SIGNATURE_VERIFICATION` | `false` |

10. Click **"Create Web Service"**

### 2.5 Lấy URL của service
- Sau khi deploy xong, copy URL: `https://twitch-minecraft-backend.onrender.com`
- Vào **Environment** tab
- Update `CALLBACK_URL` = `https://twitch-minecraft-backend.onrender.com`
- Click **"Save Changes"** (service sẽ tự restart)

---

## Bước 3: Test Backend

### 3.1 Health Check
```bash
curl https://twitch-minecraft-backend.onrender.com/health
```

Expected:
```json
{"status":"ok","timestamp":"2025-11-07T...","version":"2.0.0"}
```

### 3.2 Test Register
```bash
curl -X POST https://twitch-minecraft-backend.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "testpass123",
    "twitchClientId": "your_twitch_client_id",
    "twitchClientSecret": "your_twitch_client_secret",
    "minecraftServerUrl": "http://localhost:8081"
  }'
```

---

## Bước 4: Update Frontend

### 4.1 Update Vercel Environment Variables
1. Vào Vercel Dashboard
2. Select project: `minepath-arcade-airdrop`
3. Settings → Environment Variables
4. Update `VITE_API_URL`:
   ```
   VITE_API_URL=https://twitch-minecraft-backend.onrender.com
   ```
5. Redeploy frontend

### 4.2 Test Frontend
1. Vào https://minepath-arcade-airdrop.vercel.app/register
2. Đăng ký account mới
3. Login
4. Vào Settings → Authorize với Twitch

---

## Bước 5: Hướng dẫn Streamer

### Streamer Setup (1 lần duy nhất):

1. **Tạo Twitch Application:**
   - Vào https://dev.twitch.tv/console/apps
   - Click "Register Your Application"
   - Name: `MinePath Integration`
   - OAuth Redirect URLs: `https://twitch-minecraft-backend.onrender.com/api/oauth/callback`
   - Category: Game Integration
   - Save **Client ID** và **Client Secret**

2. **Đăng ký trên website:**
   - Vào https://minepath-arcade-airdrop.vercel.app/register
   - Nhập username, password
   - Nhập Twitch Client ID & Secret (từ bước 1)
   - Nhập Minecraft Server URL: `http://localhost:8081`

3. **Authorize với Twitch:**
   - Login vào website
   - Vào Settings
   - Click "Generate Authorization URL"
   - Click "Authorize with Twitch"
   - Cho phép ứng dụng

4. **Setup Events:**
   - Copy Broadcaster ID từ Settings page
   - Chạy command (hoặc thêm UI button):
   ```bash
   curl -X POST https://twitch-minecraft-backend.onrender.com/api/twitch/setup \
     -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"broadcasterId": "YOUR_BROADCASTER_ID"}'
   ```

5. **Done!** 🎉
   - Mở Dashboard để xem realtime events
   - Twitch events sẽ tự động trigger mobs trong Minecraft

---

## 🎯 Lưu ý quan trọng:

### Free Tier Limitations:
- ⚠️ **Render Free**: Service sleep sau 15 phút không hoạt động
- ⚠️ **First request**: Mất 30-60 giây để wake up
- ⚠️ **PostgreSQL Free**: 90 ngày trial, sau đó cần upgrade

### Solution cho Sleep:
1. **Uptime Monitor** (recommended):
   - Dùng UptimeRobot (free)
   - Ping health endpoint mỗi 5 phút
   - Giữ service luôn awake

2. **Upgrade to Paid** ($7/month):
   - Không sleep
   - Better performance
   - Persistent storage

---

## 📊 Monitor & Debug

### View Logs:
1. Render Dashboard → Your Service
2. Click "Logs" tab
3. Xem realtime logs

### Common Issues:

**Database connection failed:**
- Check DATABASE_URL environment variable
- Verify database is running (green status)

**Service crashed:**
- Check logs for error messages
- Verify all environment variables set correctly

**Twitch events not working:**
- Check CALLBACK_URL is correct
- Verify ngrok không còn chạy nữa
- Test webhook endpoint: `curl https://your-app.onrender.com/webhook/USER_ID`

---

## ✅ Checklist

- [ ] Code pushed to GitHub
- [ ] PostgreSQL database created on Render
- [ ] Backend service deployed
- [ ] Environment variables configured
- [ ] CALLBACK_URL updated
- [ ] Health check returns 200
- [ ] Frontend deployed with new API URL
- [ ] Test register/login works
- [ ] Test OAuth flow works
- [ ] Setup UptimeRobot monitor

---

**Sau khi hoàn thành, bạn có production URL cố định và không cần ngrok nữa!** 🚀
