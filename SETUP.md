# DataMind - Setup Guide

## Quick Start

### Prerequisites
- Python 3.9+ 
- Node.js 18+
- pnpm (install with `npm install -g pnpm`)
- Google Gemini API Key (free at https://ai.google.dev)

### Local Development

1. **Set your Gemini API key:**
```bash
export GEMINI_API_KEY='your-api-key-here'
```

2. **Make the run script executable:**
```bash
chmod +x run-local.sh
```

3. **Run both backend and frontend:**
```bash
./run-local.sh
```

The script will:
- Set up Python virtual environment
- Install Python dependencies
- Start FastAPI backend on http://localhost:8000
- Install Node dependencies
- Start Next.js frontend on http://localhost:3000

### Access the Application
- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs

## Manual Setup (If script doesn't work)

### Backend Setup

```bash
# Navigate to API directory
cd api

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variable
export GEMINI_API_KEY='your-api-key-here'

# Run the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at http://localhost:8000
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Frontend Setup

```bash
# In the root directory
pnpm install
pnpm dev
```

The frontend will be available at http://localhost:3000

## Environment Configuration

### Development (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Production (Vercel)
1. Set `NEXT_PUBLIC_API_URL` to your deployed backend URL
2. Set `GEMINI_API_KEY` in Vercel environment variables

## Common Issues

### Upload Fails with CORS Error
- Ensure the backend is running on http://localhost:8000
- Check that `NEXT_PUBLIC_API_URL` is correctly set in `.env.local`
- Verify CORS is enabled in FastAPI (`cors.py`)

### Voice Features Not Working
- Check browser console (F12) for errors
- Ensure microphone permissions are granted
- Voice recognition works best in Chrome/Edge browsers

### API Returns 500 Error
- Check backend console for error messages
- Ensure Gemini API key is valid
- Verify `GEMINI_API_KEY` environment variable is set

### Dataset Upload Shows "Upload Failed"
- Check file format (CSV or Excel only)
- Verify file size is reasonable (< 100MB recommended)
- Check browser console for specific error messages

## API Endpoints

### Chat
- **POST** `/chat` - Send message for analysis

### Data Management
- **POST** `/upload-dataset` - Upload CSV/Excel file
- **GET** `/dataset-info/{dataset_id}` - Get dataset metadata
- **POST** `/analyze-dataset` - Run AI analysis

### Analytics
- **POST** `/compare-datasets` - Compare two datasets
- **POST** `/kpi-analysis` - Analyze KPIs

### Voice
- **POST** `/voice-transcribe` - Transcribe audio
- **POST** `/voice-synthesis` - Convert text to speech

## Deployment

### Deploy to Vercel

1. **Frontend:**
```bash
vercel deploy
```

2. **Backend (Python):**
- Push code to GitHub
- Connect GitHub repo to Vercel
- Backend will deploy to serverless Python runtime

3. **Environment Variables:**
Set these in Vercel project settings:
- `GEMINI_API_KEY` - Your Google Gemini API key
- `NEXT_PUBLIC_API_URL` - Your deployed backend URL

## Features

✅ **Chat Interface**
- Natural language analysis
- Conversation history
- Markdown responses

✅ **Data Upload**
- CSV and Excel support
- Automatic parsing
- File validation

✅ **AI Analysis**
- Gemini-powered insights
- Statistical analysis
- Trend detection
- KPI monitoring

✅ **Voice Features**
- Speech recognition
- Text-to-speech (placeholder)
- Voice input for queries

✅ **Dashboard**
- KPI cards with trends
- Analytics page
- Trend analysis
- Settings management

## Troubleshooting

### Test Backend Health
```bash
curl http://localhost:8000/health
```

### Test Upload Endpoint
```bash
curl -F "file=@data.csv" http://localhost:8000/upload-dataset
```

### Check API Documentation
Visit http://localhost:8000/docs for interactive API documentation

## Performance Tips

1. **Large Datasets**: Optimize memory usage with data sampling
2. **API Calls**: Implement caching for repeated queries
3. **Voice**: Test in quiet environments for better recognition
4. **Browser**: Use Chrome/Edge for best feature support

## Security Notes

- Never commit `.env.local` to version control
- Keep Gemini API key private
- Use HTTPS in production
- Implement authentication for production use

## Getting Help

- Check API docs at `/docs`
- Review console logs (frontend and backend)
- Check GitHub issues
- Consult Gemini API documentation at https://ai.google.dev

## Next Steps

1. Set up your Gemini API key
2. Run the development servers
3. Upload a sample CSV file
4. Ask natural language questions about your data
5. Explore the analytics and trends pages
