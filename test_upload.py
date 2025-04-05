import requests
import os

def test_upload_example_file():
    """Test the 'Use Example File' functionality"""
    url = 'http://localhost:5000/api/upload_csv'
    
    # Create form data equivalent to what the frontend sends
    files = {'use_example': ('', 'true')}
    
    try:
        response = requests.post(url, files=files)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {str(e)}")
        return False

def test_upload_actual_file():
    """Test uploading the actual CSV file"""
    url = 'http://localhost:5000/api/upload_csv'
    file_path = os.path.join(os.getcwd(), 'accountactivity.csv')
    
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return False
    
    try:
        with open(file_path, 'rb') as f:
            files = {'file': ('accountactivity.csv', f, 'text/csv')}
            response = requests.post(url, files=files)
            
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {str(e)}")
        return False

if __name__ == "__main__":
    print("Testing 'Use Example File' functionality...")
    if test_upload_example_file():
        print("Example file test: SUCCESS")
    else:
        print("Example file test: FAILED")
    
    print("\nTesting actual file upload...")
    if test_upload_actual_file():
        print("File upload test: SUCCESS")
    else:
        print("File upload test: FAILED")
