"""
Test script to verify demo mode and analysis work without API key
"""
import requests
import json

API_BASE_URL = "http://localhost:8000"

def test_chat_demo():
    """Test chat endpoint in demo mode"""
    print("[Test] Testing chat endpoint (should work in demo mode)...")
    
    response = requests.post(
        f"{API_BASE_URL}/chat",
        json={
            "message": "What are the trends in this data?",
            "dataset_id": "test123",
        }
    )
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Chat working!")
        print(f"Response: {data.get('response', '')[:100]}...")
        return True
    else:
        print(f"✗ Failed: {response.text[:200]}")
        return False

def test_health():
    """Test health endpoint"""
    print("\n[Test] Testing health endpoint...")
    response = requests.get(f"{API_BASE_URL}/health")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Health check passed")
        print(f"Services: {json.dumps(data.get('services'), indent=2)}")
        return True
    return False

if __name__ == "__main__":
    print("=" * 50)
    print("Testing Demo Mode")
    print("=" * 50)
    
    if test_health():
        test_chat_demo()
    
    print("\n" + "=" * 50)
    print("Test complete!")
    print("=" * 50)
