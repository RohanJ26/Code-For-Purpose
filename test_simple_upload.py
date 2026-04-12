"""
Simple test for file upload only - to verify the upload functionality works
"""
import requests
import pandas as pd
import io
import json

API_BASE_URL = "http://localhost:8000"

def test_simple_csv_upload():
    """Test uploading a simple CSV file"""
    print("[Test] Creating test CSV file...")
    
    # Create simple sample data
    data = {
        'Name': ['Alice', 'Bob', 'Charlie'],
        'Score': [95, 87, 92],
        'Grade': ['A', 'B', 'A'],
    }
    df = pd.DataFrame(data)
    
    print("[Test] Sample data created:")
    print(df)
    
    # Save to bytes
    csv_buffer = io.BytesIO()
    df.to_csv(csv_buffer, index=False)
    csv_buffer.seek(0)
    
    print("\n[Test] Uploading CSV file...")
    files = {'file': ('test_simple.csv', csv_buffer, 'text/csv')}
    
    response = requests.post(f"{API_BASE_URL}/upload-dataset", files=files)
    
    print(f"[Test] Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        dataset_id = data.get('dataset_id')
        print(f"[Test] ✓ Upload successful! Dataset ID: {dataset_id}")
        print(f"[Test] Dataset Info:")
        info = data.get('info', {})
        print(f"  - Rows: {info.get('rows')}")
        print(f"  - Columns: {info.get('columns')}")
        print(f"  - Column names: {[col.get('name') for col in info.get('column_info', [])]}")
        print(f"  - Column info: {json.dumps(info.get('column_info', []), indent=2)}")
        return dataset_id
    else:
        print(f"[Test] ✗ Upload failed!")
        print(f"[Test] Response: {response.text}")
        return None

if __name__ == "__main__":
    print("=" * 50)
    print("Simple File Upload Test")
    print("=" * 50)
    
    dataset_id = test_simple_csv_upload()
    
    if dataset_id:
        print(f"\n✓ All tests passed!")
    else:
        print(f"\n✗ Test failed")
