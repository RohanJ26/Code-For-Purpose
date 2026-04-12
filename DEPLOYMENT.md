# Deployment Guide - AI Business Analyst Platform

This guide covers deploying the AI Business Analyst platform to production on Vercel.

## Architecture Overview

- **Frontend**: Next.js 16 (React) - Deployed on Vercel
- **Backend**: Python FastAPI - Deployed on Vercel Python Runtime
- **AI**: Google Gemini API
- **Data**: In-memory + File storage (upgradeable to databases)

## Local Development

### Prerequisites
- Node.js 18+
- Python 3.10+
- Google Gemini API Key

### Setup

1. **Clone and install dependencies:**
```bash
# Frontend dependencies
npm install
# or
pnpm install

# API dependencies
cd api
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

2. **Configure environment:**
```bash
# Copy env example and fill in values
cp .env.example .env.local
cp api/.env.example api/.env

# Add your GEMINI_API_KEY to both files
```

3. **Run locally:**

**Option A: Docker Compose (Recommended)**
```bash
docker-compose up
# Frontend: http://localhost:3000
# API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

**Option B: Manual Development**

Terminal 1 - Frontend:
```bash
npm run dev
# Open http://localhost:3000
```

Terminal 2 - API:
```bash
cd api
source venv/bin/activate
python -m uvicorn main:app --reload --port 8000
# API Docs: http://localhost:8000/docs
```

## Production Deployment on Vercel

### Step 1: Prepare Repository

```bash
# Initialize Git if not already done
git init
git add .
git commit -m "Initial commit: AI Business Analyst Platform"

# Push to GitHub (required for Vercel)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### Step 2: Deploy Frontend

1. Go to [vercel.com](https://vercel.com)
2. Click "Import Project"
3. Select your GitHub repository
4. Configure project:
   - Framework: Next.js
   - Build command: `npm run build`
   - Output directory: `.next`
5. Add environment variables:
   - `NEXT_PUBLIC_API_URL`: Your API endpoint (set after deploying backend)
   - `NODE_ENV`: `production`
6. Click "Deploy"

### Step 3: Deploy Backend (Python API)

The backend is configured to deploy as a Vercel Function:

1. **Vercel Configuration** (already included in `vercel.json`):
```json
{
  "buildCommand": "pip install -r api/requirements.txt",
  "functions": {
    "api/main.py": {
      "runtime": "python3.12"
    }
  }
}
```

2. **Deploy with Frontend**:
The backend will deploy automatically as part of the Vercel deployment.

3. **Backend URL**:
Your API will be available at: `https://YOUR_DOMAIN.vercel.app/api`

### Step 4: Configure Environment Variables

In Vercel project settings, add:

1. **Frontend (.env)**:
   - `NEXT_PUBLIC_API_URL`: `https://YOUR_DOMAIN.vercel.app`
   - `NODE_ENV`: `production`

2. **Backend (Python)**:
   - `GEMINI_API_KEY`: Your Google Gemini API key
   - `ENVIRONMENT`: `production`

### Step 5: Verify Deployment

1. **Frontend**: Visit `https://YOUR_DOMAIN.vercel.app`
2. **API Docs**: Visit `https://YOUR_DOMAIN.vercel.app/api/docs`
3. **Health Check**: 
   ```bash
   curl https://YOUR_DOMAIN.vercel.app/api/health
   ```

## Environment Variables

### Frontend (.env.local)
```
GEMINI_API_KEY=sk-xxxxx
NEXT_PUBLIC_API_URL=https://your-domain.vercel.app
```

### Backend (api/.env)
```
GEMINI_API_URL=https://generativelanguage.googleapis.com
GEMINI_API_KEY=sk-xxxxx
ENVIRONMENT=production
LOG_LEVEL=INFO
```

## API Endpoints

### Health Check
```bash
GET /health
```

### Chat
```bash
POST /api/chat
Content-Type: application/json

{
  "message": "What are the top 5 products by revenue?",
  "conversation_history": [],
  "context": {}
}
```

### Upload Dataset
```bash
POST /api/upload-dataset
Content-Type: multipart/form-data

file: <your-csv-or-xlsx-file>
```

### Analyze Dataset
```bash
POST /api/analyze-dataset
Content-Type: application/json

{
  "dataset_id": "abc123",
  "analysis_type": "comprehensive",
  "focus_areas": ["column1", "column2"]
}
```

## Performance Optimization

### Frontend Optimizations
- Static site generation for pages without dynamic data
- Image optimization with Next.js Image component
- Code splitting and lazy loading
- Streaming responses for chat

### Backend Optimizations
- Response caching with Redis (future)
- Database connection pooling
- Async request handling
- Request timeout configuration

## Monitoring & Logging

### Vercel Dashboard
- Real-time logs available in Vercel dashboard
- Automatic error tracking and alerting
- Performance metrics and analytics

### Application Logging
```python
import logging
logger = logging.getLogger(__name__)
logger.info("Message")
logger.error("Error message")
```

## Scaling Considerations

### Horizontal Scaling
- Vercel handles auto-scaling for serverless functions
- Frontend: Automatically scaled globally across CDN
- Backend: Scaled by request volume

### Database (Future)
```python
# Upgrade from file storage to PostgreSQL
# Example migration:
# - Replace DataService file storage
# - Add Neon/Supabase integration
# - Implement connection pooling
```

### Caching
```python
# Add Redis caching for analysis results
# Store expensive computation results
# Implement cache invalidation strategy
```

## Troubleshooting

### API Connection Issues
```bash
# Check health endpoint
curl https://your-domain.vercel.app/api/health

# Check environment variables in Vercel dashboard
# Ensure NEXT_PUBLIC_API_URL is correct
```

### File Upload Failures
- Check max file size limit (default 100MB)
- Verify Content-Type headers
- Check available disk space on server

### Slow Performance
- Check Gemini API response times
- Monitor dataset size processing
- Review database queries (if applicable)

## Production Checklist

- [ ] Environment variables configured in Vercel
- [ ] API health check passing
- [ ] Frontend loads without CORS errors
- [ ] File uploads working
- [ ] Chat endpoint responding
- [ ] KPI dashboard loading data
- [ ] Analytics page rendering
- [ ] Error logging configured
- [ ] Performance monitoring enabled
- [ ] Backup and disaster recovery plan

## Support & Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [Google Gemini API](https://ai.google.dev)

## License

MIT License - See LICENSE file for details
