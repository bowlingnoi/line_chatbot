# Deployment Guide

This guide covers deploying the Shippop LINE MCP Bot to production environments.

## Prerequisites

Before deploying, ensure you have:
- ✅ Tested the bot locally
- ✅ Valid LINE credentials
- ✅ Valid OpenAI API key
- ✅ FAQ document finalized

## Deployment Options

### Option 1: Railway (Recommended)

[Railway](https://railway.app) offers free tier and simple deployment.

**Steps:**

1. **Sign up** at railway.app

2. **Create New Project** → Deploy from GitHub

3. **Connect your repository** or upload code

4. **Add environment variables:**
   ```
   PORT=3000
   NODE_ENV=production
   LINE_CHANNEL_ACCESS_TOKEN=<your_token>
   LINE_CHANNEL_SECRET=<your_secret>
   OPENAI_API_KEY=<your_key>
   OPENAI_MODEL=gpt-4o-mini
   FAQ_FILE_PATH=./data/faq.md
   LOG_LEVEL=info
   ```

5. **Deploy** - Railway will auto-detect Node.js and deploy

6. **Copy your Railway URL** (e.g., `https://your-app.railway.app`)

7. **Configure LINE webhook** with your Railway URL + `/webhook`

**Pros:**
- ✅ Free tier available
- ✅ Auto-deploy on git push
- ✅ Built-in HTTPS
- ✅ Easy to use

### Option 2: Render

[Render](https://render.com) provides free tier with auto-sleep.

**Steps:**

1. **Sign up** at render.com

2. **New Web Service** → Connect repository

3. **Configure:**
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance Type: Free

4. **Add environment variables** (same as Railway)

5. **Deploy**

6. **Configure LINE webhook** with Render URL

**Note:** Free tier sleeps after inactivity, may have cold start delays.

### Option 3: Heroku

**Steps:**

1. **Install Heroku CLI:**
   ```bash
   brew install heroku/brew/heroku  # macOS
   ```

2. **Login and create app:**
   ```bash
   heroku login
   heroku create shippop-line-bot
   ```

3. **Set environment variables:**
   ```bash
   heroku config:set LINE_CHANNEL_ACCESS_TOKEN=your_token
   heroku config:set LINE_CHANNEL_SECRET=your_secret
   heroku config:set OPENAI_API_KEY=your_key
   heroku config:set OPENAI_MODEL=gpt-4o-mini
   heroku config:set FAQ_FILE_PATH=./data/faq.md
   ```

4. **Create Procfile:**
   ```
   web: node src/server.js
   ```

5. **Deploy:**
   ```bash
   git add .
   git commit -m "Deploy to Heroku"
   git push heroku main
   ```

6. **Configure LINE webhook:** `https://your-app.herokuapp.com/webhook`

### Option 4: AWS EC2 / DigitalOcean

For full control, deploy on a VPS:

**Steps:**

1. **Provision Ubuntu server**

2. **Install Node.js:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Clone and setup:**
   ```bash
   cd /var/www
   git clone your-repo.git line-mcp
   cd line-mcp
   npm install
   ```

4. **Create .env file:**
   ```bash
   nano .env
   # Add all environment variables
   ```

5. **Install PM2:**
   ```bash
   sudo npm install -g pm2
   pm2 start src/server.js --name line-bot
   pm2 startup
   pm2 save
   ```

6. **Setup nginx reverse proxy:**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

7. **Setup SSL with Let's Encrypt:**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

8. **Configure LINE webhook:** `https://your-domain.com/webhook`

## Docker Deployment (Optional)

Create `Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "src/server.js"]
```

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  line-bot:
    build: .
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - NODE_ENV=production
      - LINE_CHANNEL_ACCESS_TOKEN=${LINE_CHANNEL_ACCESS_TOKEN}
      - LINE_CHANNEL_SECRET=${LINE_CHANNEL_SECRET}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - OPENAI_MODEL=gpt-4o-mini
      - FAQ_FILE_PATH=./data/faq.md
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

Deploy:
```bash
docker-compose up -d
```

## Post-Deployment Checklist

- [ ] Verify server is running (check health endpoint)
- [ ] Test webhook in LINE Console (should show success)
- [ ] Send test messages from LINE app
- [ ] Monitor logs for errors
- [ ] Check analytics endpoint
- [ ] Set up monitoring/alerts
- [ ] Configure backup for FAQ document
- [ ] Document your deployment setup

## Monitoring

### Health Check Endpoint

```bash
curl https://your-domain.com/
```

Expected response:
```json
{
  "status": "ok",
  "service": "Shippop LINE MCP Bot",
  "version": "1.0.0"
}
```

### Analytics Endpoint

```bash
curl https://your-domain.com/analytics
```

### Application Logs

**Railway/Render:** Check platform dashboard

**Heroku:**
```bash
heroku logs --tail
```

**PM2:**
```bash
pm2 logs line-bot
```

## Updating FAQ

### Railway/Render (with Git)

1. Update `data/faq.md`
2. Commit and push
3. Platform auto-deploys

### Heroku

```bash
git add data/faq.md
git commit -m "Update FAQ"
git push heroku main
```

### VPS/EC2

```bash
cd /var/www/line-mcp
git pull
pm2 restart line-bot
```

## Troubleshooting Production Issues

### Bot not responding

1. Check server logs
2. Verify environment variables
3. Test health endpoint
4. Check LINE webhook status
5. Verify OpenAI API credits

### High latency

1. Check OpenAI API response times
2. Consider caching improvements
3. Upgrade server resources
4. Use faster OpenAI model

### Memory issues

1. Monitor memory usage
2. Implement log rotation
3. Clear analytics periodically
4. Upgrade server tier

## Security Best Practices

1. **Use environment variables** for all secrets
2. **Enable HTTPS** (required by LINE)
3. **Validate webhook signatures** in production
4. **Rate limit** webhook endpoint
5. **Monitor for abuse** patterns
6. **Keep dependencies updated**
7. **Use least privilege** for API keys
8. **Backup FAQ** regularly

## Cost Estimation

### Monthly Costs (Approximate)

| Service | Free Tier | Paid Tier |
|---------|-----------|-----------|
| Railway | Free (limited) | ~$5-20/month |
| Render | Free (sleeps) | ~$7/month |
| Heroku | $0 (eco tier) | ~$7/month |
| AWS EC2 | Free tier 1yr | ~$5-15/month |
| OpenAI API | Pay-per-use | ~$5-50/month* |
| LINE | Free | Free |

*OpenAI costs depend on usage. ~1000 queries ≈ $2-5

### Sample Cost Breakdown (1000 queries/month)

- Hosting: $7/month (Render/Heroku)
- OpenAI API: $3/month
- **Total: ~$10/month**

**ROI:** If automating 700 tickets saving 15min each:
- Time saved: 175 hours/month
- Value (at $20/hr): $3,500/month
- **Net savings: $3,490/month**

## Scaling Considerations

### For Higher Traffic

1. **Upgrade server tier** for more resources
2. **Enable caching** (Redis for FAQ)
3. **Use OpenAI batch API** for cost savings
4. **Implement queue system** (Bull/Agenda)
5. **Add load balancer** for multiple instances
6. **Consider serverless** (AWS Lambda, Cloud Functions)

### For Multiple Channels

1. Abstract platform-specific code
2. Create adapter pattern for different messengers
3. Share MCP/AI services across platforms
4. Centralize analytics

## Support

For deployment issues:
- Check platform documentation
- Review server logs
- Test locally first
- Contact support@shippop.com

---

**Last Updated:** November 2025
