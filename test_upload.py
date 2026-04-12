"""
Test script to verify file upload and analysis works
"""
import requests
import pandas as pd
import io
import json

API_BASE_URL = "http://localhost:8000"

def test_csv_upload():
    """Test uploading a CSV file"""
    print("[Test] Creating test CSV file...")
    
    # Create sample CSV data
    data = {
        'Year': [2020, 2021, 2022, 2023, 2024],
        'Sales': [100000, 150000, 200000, 250000, 300000],
        'Profit': [10000, 22500, 50000, 75000, 90000],
        'Employees': [10, 15, 25, 35, 45],
        'Region': ['North', 'South', 'East', 'West', 'Central']
    }
    df = pd.DataFrame(data)
    
    # Save to bytes
    csv_buffer = io.BytesIO()
    df.to_csv(csv_buffer, index=False)
    csv_buffer.seek(0)
    
    print("[Test] Uploading CSV file...")
    files = {'file': ('test_data.csv', csv_buffer, 'text/csv')}
    
    response = requests.post(f"{API_BASE_URL}/upload-dataset", files=files)
    
    print(f"[Test] Status: {response.status_code}")
    print(f"[Test] Response: {response.text}")
    
    if response.status_code == 200:
        data = response.json()
        dataset_id = data.get('dataset_id')
        print(f"[Test] ✓ Upload successful! Dataset ID: {dataset_id}")
        print(f"[Test] Dataset Info: {json.dumps(data.get('info', {}), indent=2)}")
        return dataset_id
    else:
        print(f"[Test] ✗ Upload failed!")
        return None

def test_chat(dataset_id):
    """Test chat endpoint with dataset"""
    print(f"\n[Test] Testing chat with dataset {dataset_id}...")
    
    response = requests.post(
        f"{API_BASE_URL}/chat",
        json={
            "message": "What are the key trends in this data?",
            "dataset_id": dataset_id,
        }
    )
    
    print(f"[Test] Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"[Test] ✓ Chat successful!")
        print(f"[Test] Response: {data.get('response', '')[:200]}...")
    else:
        print(f"[Test] ✗ Chat failed!")
        print(f"[Test] Error: {response.text}")

def test_analyze(dataset_id):
    """Test analysis endpoint"""
    print(f"\n[Test] Testing dataset analysis...")
    
    response = requests.post(
        f"{API_BASE_URL}/analyze-dataset",
        json={
            "dataset_id": dataset_id,
            "analysis_type": "comprehensive",
            "focus_areas": ["Sales", "Profit"]
        }
    )
    
    print(f"[Test] Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"[Test] ✓ Analysis successful!")
        print(f"[Test] Analysis: {json.dumps(data.get('analysis', {}), indent=2)[:300]}...")
    else:
        print(f"[Test] ✗ Analysis failed!")
        print(f"[Test] Error: {response.text}")

if __name__ == "__main__":
    print("=" * 50)
    print("Starting API Tests")
    print("=" * 50)
    
    # Test upload
    dataset_id = test_csv_upload()
    
    if dataset_id:
        # Test chat
        test_chat(dataset_id)
        
        # Test analysis
        test_analyze(dataset_id)
        
        print("\n" + "=" * 50)
        print("All tests completed!")
        print("=" * 50)
    else:
        print("\n[Test] Upload test failed. Skipping other tests.")
