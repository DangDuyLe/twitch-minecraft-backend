# How to Create ngrok URL

## Step 1: Sign up for ngrok (if you haven't already)
Visit: https://dashboard.ngrok.com/signup

## Step 2: Get your authtoken
Visit: https://dashboard.ngrok.com/get-started/your-authtoken

## Step 3: Authenticate ngrok
Run this command (replace YOUR_TOKEN with your actual token):

```powershell
ngrok config add-authtoken 34rTvpKxi9Thgm05t35H4oXi5Uo_AdZCP7zjmw4w2iMj32X5
```

## Step 4: Start ngrok tunnel
```powershell
ngrok http 3000
```

## What you'll see:

```
ngrok

Session Status                online
Account                       YourEmail@example.com
Version                       3.x.x
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123-def456.ngrok-free.app -> http://localhost:3000

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

## Step 5: Copy your HTTPS URL
Look for the "Forwarding" line and copy the HTTPS URL:
**Example:** `https://abc123-def456.ngrok-free.app`

This is your CALLBACK_URL for the .env file!

## Important Notes:
- ⚠️ **Keep the ngrok terminal open** - Closing it will stop the tunnel
- ⚠️ **Free tier URLs change** - Every time you restart ngrok, you get a new URL
- 💡 **Web Interface** - Visit http://127.0.0.1:4040 to see live requests/responses
- 💰 **Paid tier** - Get a static domain that never changes

## Next Steps:
1. Copy the HTTPS URL from ngrok
2. Create .env file: `copy .env.example .env`
3. Edit .env and set: `CALLBACK_URL=https://your-ngrok-url-here`
