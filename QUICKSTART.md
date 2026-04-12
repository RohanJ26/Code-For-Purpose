# DataMind - Quick Start Guide

## Get Your Gemini API Key (1 minute)

1. Go to https://ai.google.dev
2. Click "Get API Key"
3. Create new API key for free
4. Copy the key

## Run Locally (3 steps)

### Step 1: Set API Key
```bash
export GEMINI_API_KEY='paste-your-key-here'
```

### Step 2: Start Backend (in one terminal)
```bash
cd api
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

You should see:
```
Uvicorn running on http://127.0.0.1:8000
```

### Step 3: Start Frontend (in another terminal)
```bash
pnpm install
pnpm dev
```

You should see:
```
- Local: http://localhost:3000
```

## Test Everything Works

1. **Open** http://localhost:3000
2. **Upload** a CSV or Excel file
3. **Click** Analysis/Trends/Settings in sidebar
4. **Try** microphone button to speak
5. **Ask** questions about your data

## What You Can Do

✅ Upload data (CSV, Excel)
✅ Chat with AI about data
✅ View analytics dashboard
✅ Analyze trends
✅ Use voice input/output
✅ Compare datasets
✅ Get KPI insights

## Troubleshooting

### Backend won't start
```bash
# Make sure you set the API key
echo $GEMINI_API_KEY

# Should output your key, if empty:
export GEMINI_API_KEY='your-key'
```

### Upload fails
- Check backend is running: http://localhost:8000/health
- Check console for error (F12 > Console)
- Try a small CSV file first

### Voice doesn't work
- Use Chrome or Edge
- Allow microphone access
- Check browser permissions

### Can't connect frontend to backend
- Verify `.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:8000`
- Check CORS is enabled (it is by default)
- Both must be running simultaneously

## API Documentation

While running, visit: http://localhost:8000/docs

Interactive API explorer built-in!

## Next Steps

1. Upload your data
2. Ask AI questions
3. Explore trends and analytics
4. Check settings
5. Deploy to Vercel when ready

## Deploy to Vercel

```bash
vercel deploy
```

Set environment variables in Vercel:
- `GEMINI_API_KEY` = your key
- `NEXT_PUBLIC_API_URL` = backend URL

Done! 🚀

## Files Guide

```
├── api/                      # FastAPI backend
│   ├── main.py             # API server
│   ├── services/           # AI, data, visualization
│   └── models/             # Data schemas
├── app/                     # Next.js frontend
│   ├── page.tsx           # Main dashboard
│   ├── analytics/page.tsx  # Analytics
│   ├── trends/page.tsx     # Trends
│   └── settings/page.tsx   # Settings
├── components/            # React components
├── hooks/                 # Custom hooks (voice)
└── api/requirements.txt   # Python dependencies
```

## Key Features

### Chat Interface
- Natural language queries
- AI-powered analysis
- Real-time responses

### Data Upload
- CSV/Excel support
- Automatic parsing
- Dataset management

### Analytics
- KPI dashboard
- Trend analysis
- Predictions

### Voice
- Speak questions
- Voice transcription
- Audio responses

## Performance

- Frontend: Next.js 16 (optimized)
- Backend: FastAPI (async)
- AI: Google Gemini (fast)
- Voice: Web Speech API (real-time)

## Security

- API keys in environment variables
- CORS enabled for frontend
- No data stored permanently
- HTTPS ready for production

## Support

1. Check console logs (F12)
2. Review `SETUP.md` for detailed setup
3. Check `FIXES_APPLIED.md` for known issues
4. Visit `/docs` for API help

## Architecture Highlights

### Frontend
- React 19 with Next.js 16
- Modern UI with shadcn components
- Real-time chat interface
- Voice integration

### Backend
- Clean layered architecture
- Service-oriented design
- Async/await patterns
- Gemini API integration

### Data Pipeline
1. Upload → Parse (Pandas)
2. Analyze → Extract insights (AI)
3. Visualize → Display results
4. Chat → Ask questions

## Ready? Let's go! 🚀

```bash
# Terminal 1 - Backend
cd api && uvicorn main:app --reload

# Terminal 2 - Frontend
pnpm dev

# Browser
http://localhost:3000
```

Enjoy! 🎉
