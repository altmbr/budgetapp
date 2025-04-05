from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import csv
import sqlite3
import uuid

app = Flask(__name__)
CORS(app)

@app.route('/api/upload_test', methods=['POST'])
def upload_test():
    print("Received test upload request")
    return jsonify({"status": "success"}), 200

@app.route('/api/example', methods=['POST'])
def use_example():
    print("Received example file request")
    # Try to process the example file
    try:
        rows = process_csv('accountactivity.csv')
        return jsonify({"status": "success", "rows": rows}), 200
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/upload', methods=['POST'])
def upload_file():
    print("Received file upload request")
    if 'file' not in request.files:
        return jsonify({"status": "error", "message": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"status": "error", "message": "No file selected"}), 400
    
    try:
        # Save file temporarily
        temp_path = 'temp_upload.csv'
        file.save(temp_path)
        
        # Process the file
        rows = process_csv(temp_path)
        
        # Clean up
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
        return jsonify({"status": "success", "rows": rows}), 200
    except Exception as e:
        print(f"Error: {str(e)}")
        # Clean up
        if os.path.exists('temp_upload.csv'):
            os.remove('temp_upload.csv')
        return jsonify({"status": "error", "message": str(e)}), 500

def process_csv(file_path):
    """Process a CSV file and return the number of rows processed"""
    # Connect to database
    conn = sqlite3.connect('finance.db')
    cursor = conn.cursor()
    processed_rows = 0
    
    try:
        # Read the CSV file
        with open(file_path, 'r', newline='') as f:
            reader = csv.reader(f, quoting=csv.QUOTE_ALL)
            for row in reader:
                if len(row) < 3:
                    continue
                
                # Create a transaction ID
                transaction_id = str(uuid.uuid4())
                
                # Get date and description
                date = row[0].strip()
                description = row[1].strip()
                
                # First try column 2 (debit/outgoing)
                amount = None
                if row[2].strip():
                    try:
                        amount_str = row[2].strip().replace(',', '')
                        amount = -1 * float(amount_str)
                    except ValueError:
                        pass
                
                # If no amount in column 2, try column 3 (credit/incoming)
                if amount is None and len(row) > 3 and row[3].strip():
                    try:
                        amount_str = row[3].strip().replace(',', '')
                        amount = float(amount_str)
                    except ValueError:
                        pass
                
                if amount is None:
                    continue
                
                # Insert into database
                cursor.execute(
                    'INSERT INTO transactions (id, date, description, amount, category) VALUES (?, ?, ?, ?, ?)',
                    (transaction_id, date, description, amount, '')
                )
                processed_rows += 1
        
        # Commit the changes
        conn.commit()
    except Exception as e:
        conn.close()
        raise e
    
    conn.close()
    return processed_rows

if __name__ == '__main__':
    app.run(port=5001, debug=True)
