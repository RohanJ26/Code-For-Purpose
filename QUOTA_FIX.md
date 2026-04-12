# Gemini API Quota Issue - Solutions

## Problem
You're getting a **429 error** which means you've exceeded the free tier quota for Google's Gemini API.

Free tier limits:
- ⏱️ **60 requests per minute**
- 📊 **1.5M tokens per day**

## Solutions

### Option 1: Wait and Retry (Free)
The quota resets daily. Wait a few minutes and try again.

### Option 2: Upgrade Your API Plan (Recommended)
1. Go to: https://aistudio.google.com/app/apikey
2. Look for "Billing" or "Projects" section
3. Set up billing to get higher quotas
4. With billing enabled, you get:
   - 1,000+ requests per minute
   - 10M+ tokens per day
   - Much better performance

### Option 3: Use a Different API Key
If you have another Google Cloud project with a higher quota:
1. Get your API key from that project
2. Update it in `.env.local`:
   ```
   GEMINI_API_KEY=your-new-key-here
   ```
3. Restart the backend

## What I've Done to Help

✅ **Optimizations Made:**
- Switched to lighter `gemini-1.5-flash` model (faster, uses fewer tokens)
- Reduced token generation limit from 8096 to 1500
- Added response caching for common questions
- Simplified prompts to use fewer tokens
- Added 1-second rate limiting between requests
- Better error messages about quota limits

✅ **File Upload Still Works** (no API calls needed)
✅ **Better Error Handling** (friendly messages)

## Quick Fix for Testing

For demo purposes, switch to a mock AI (no API calls):

### Edit: `api/services/ai_service.py`
Replace the `chat()` method with:
```python
async def chat(...) -> str:
    return "This is a demo response. To use real AI analysis, please upgrade your API plan."
```

## How to Monitor Usage
- Visit: https://ai.dev/rate-limit
- Check your current token usage
- See when quota resets

## Next Steps
1. **For development**: Upgrade your API plan (recommended)
2. **For testing**: Use the demo responses
3. **For production**: Implement proper quota management and billing

---

**Need help?** Check Google's rate limit documentation:
https://ai.google.dev/gemini-api/docs/rate-limits
