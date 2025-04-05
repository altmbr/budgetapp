import os
import datetime
import json
import csv
import sqlite3
import uuid
import shutil
import pandas as pd
from io import StringIO
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
import traceback

app = Flask(__name__, static_folder='frontend/build', static_url_path='')
# Enable CORS with maximum permissiveness
CORS(app)

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# Initialize SQLite database
def init_db():
    conn = sqlite3.connect('finance.db')
    cursor = conn.cursor()
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        date TEXT,
        description TEXT,
        amount REAL,
        category TEXT,
        custom_category TEXT,
        currency TEXT DEFAULT 'USD',
        account TEXT,
        memo TEXT
    )
    ''')
    conn.commit()
    conn.close()

def migrate_db_schema():
    """Check if the database schema needs to be migrated and add any missing columns"""
    conn = sqlite3.connect('finance.db')
    cursor = conn.cursor()
    
    # Check what columns exist
    cursor.execute("PRAGMA table_info(transactions)")
    columns = [column[1] for column in cursor.fetchall()]
    
    # Add currency column if it doesn't exist
    if 'currency' not in columns:
        print("Migrating database: Adding currency column to transactions table")
        cursor.execute('ALTER TABLE transactions ADD COLUMN currency TEXT DEFAULT "USD"')
        conn.commit()
        print("Migration complete: Added currency column")
    
    # Add account column if it doesn't exist
    if 'account' not in columns:
        print("Migrating database: Adding account column to transactions table")
        cursor.execute('ALTER TABLE transactions ADD COLUMN account TEXT')
        conn.commit()
        print("Migration complete: Added account column")
    
    # Add memo column if it doesn't exist
    if 'memo' not in columns:
        print("Migrating database: Adding memo column to transactions table")
        cursor.execute('ALTER TABLE transactions ADD COLUMN memo TEXT')
        conn.commit()
        print("Migration complete: Added memo column")
    
    conn.close()

init_db()
migrate_db_schema()  # Call the migration function after init_db

# Route to handle CSV upload
@app.route('/api/upload_csv', methods=['POST', 'OPTIONS'])
def upload_csv():
    # Handle preflight requests
    if request.method == 'OPTIONS':
        return '', 200
    
    print("===== CSV UPLOAD REQUEST =====")
    print(f"Method: {request.method}")
    print(f"Content-Type: {request.content_type}")
    print(f"Files: {list(request.files.keys()) if request.files else 'No files'}")
    print(f"Form: {list(request.form.keys()) if request.form else 'No form data'}")
    print(f"Data: {request.get_data()[:100]}")  # Show first 100 bytes of request data
        
    try:
        # First, check if we should use the example file
        if request.form and 'use_example' in request.form:
            print("Using example file from form data")
            return process_example_file()
        
        # Check for JSON content type before trying to parse JSON
        if request.is_json:
            data = request.get_json()
            if data and data.get('use_example'):
                print("Using example file from JSON data")
                return process_example_file()
        
        # Then, check for uploaded file
        if request.files and 'file' in request.files:
            file = request.files['file']
            print(f"Found file in request: {file.filename}, content_type={file.content_type}")
            if file and file.filename:
                return process_uploaded_file(file)
            else:
                print("File object exists but filename is empty")
        else:
            print("No 'file' found in request.files. Keys found:", list(request.files.keys()) if request.files else "None")
        
        # If we made it here, something is wrong with the request
        if request.data and len(request.data) > 0 and b'example' in request.data:
            print("Found 'example' in raw request data, using example file")
            return process_example_file()
        
        print("Invalid request format - no valid file or example request found")
        return jsonify({'error': 'Invalid request format: No file or example data found'}), 400
        
    except Exception as e:
        print(f"Server error in upload_csv: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': f'Server error: {str(e)}'}), 500

def clear_transactions():
    """Clear all transactions from the database"""
    print("Clearing all existing transactions from database")
    conn = sqlite3.connect('finance.db')
    cursor = conn.cursor()
    cursor.execute('DELETE FROM transactions')
    conn.commit()
    conn.close()
    print("Transactions table cleared")

def process_example_file():
    """Process the example sample_transactions.csv file"""
    example_file_path = os.path.join(os.getcwd(), 'sample_transactions.csv')
    
    if not os.path.exists(example_file_path):
        print(f"Example file not found at {example_file_path}")
        return jsonify({'error': 'Example file not found'}), 404
    
    try:
        # Clear existing transactions before adding new ones
        clear_transactions()
        
        rows_processed = process_sample_transactions_csv(example_file_path)
        print(f"Successfully processed {rows_processed} rows from example file")
        return jsonify({'message': f'Successfully processed {rows_processed} rows'}), 200
    except Exception as e:
        print(f"Error processing example file: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': f'Error processing file: {str(e)}'}), 500

def process_uploaded_file(file):
    """Process an uploaded file"""
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    print(f"Processing uploaded file: {file.filename}")
    
    # Save the file temporarily
    temp_file_path = os.path.join(os.getcwd(), 'temp_upload.csv')
    try:
        file.save(temp_file_path)
        print(f"File saved to {temp_file_path}")
        
        # Show file contents for debugging
        try:
            with open(temp_file_path, 'r') as f:
                file_contents = f.read(500)  # Read first 500 chars
                print(f"File contents (first 500 chars):\n{file_contents}")
        except Exception as read_err:
            print(f"Error reading temp file: {str(read_err)}")
        
        # Clear existing transactions before adding new ones
        clear_transactions()
        
        # Check if this is a sample file with debit/credit format
        if 'sample_transactions.csv' in file.filename.lower() or 'debit' in file_contents.lower() and 'credit' in file_contents.lower():
            print("Detected sample transactions format with debit/credit columns")
            rows_processed = process_sample_transactions_csv(temp_file_path)
        else:
            # Use the original account activity format processor
            rows_processed = process_account_activity_csv(temp_file_path)
            
        print(f"Successfully processed {rows_processed} rows from uploaded file")
        
        # Clean up
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
            
        return jsonify({'message': f'Successfully processed {rows_processed} rows'}), 200
    except Exception as e:
        print(f"Error processing uploaded file: {str(e)}")
        traceback.print_exc()
        
        # Clean up
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
            
        return jsonify({'error': f'Error processing file: {str(e)}'}), 500

def process_sample_transactions_csv(file_path):
    """Process a sample_transactions.csv format with debit/credit columns"""
    print(f"Processing sample transactions CSV: {file_path}")
    
    # Connect to database
    conn = sqlite3.connect('finance.db')
    cursor = conn.cursor()
    
    processed_rows = 0
    
    try:
        # Read the CSV file with header row
        df = pd.read_csv(file_path)
        print(f"Read CSV with pandas. Columns: {df.columns.tolist()}")
        print(f"Sample data:\n{df.head()}")
        
        # Process each row
        for index, row in df.iterrows():
            try:
                # Create a transaction ID
                transaction_id = str(uuid.uuid4())
                
                # Get date and description
                date = row['date']
                description = row['description']
                
                # Calculate amount from debit/credit columns
                amount = None
                
                # Check if debit column exists and has a value
                if 'debit' in df.columns and pd.notna(row['debit']):
                    amount = -1 * float(row['debit'])  # Negative for debits
                    print(f"Found debit amount: {amount}")
                
                # If no debit amount, check for credit column
                if amount is None and 'credit' in df.columns and pd.notna(row['credit']):
                    amount = float(row['credit'])  # Positive for credits
                    print(f"Found credit amount: {amount}")
                
                # If neither debit nor credit, skip
                if amount is None:
                    print(f"Skipping row, no valid amount: {row}")
                    continue
                
                print(f"Processing transaction: {date}, {description}, ${amount}")
                
                # Insert into database
                cursor.execute(
                    'INSERT INTO transactions (id, date, description, amount, category, currency, account, memo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    (transaction_id, date, description, amount, '', 'USD', '', '')
                )
                processed_rows += 1
                
            except Exception as e:
                print(f"Error processing row {row}: {str(e)}")
                traceback.print_exc()
        
        # Commit the changes
        conn.commit()
        print(f"Processed {processed_rows} rows")
        
    except Exception as e:
        print(f"Error processing CSV: {str(e)}")
        traceback.print_exc()
        raise
        
    finally:
        conn.close()
    
    return processed_rows

def process_account_activity_csv(file_path):
    """Custom function to process accountactivity.csv format"""
    print(f"Processing account activity CSV: {file_path}")
    
    # Connect to database
    conn = sqlite3.connect('finance.db')
    cursor = conn.cursor()
    
    processed_rows = 0
    
    try:
        # Try using pandas to read the file first, as it's more robust
        try:
            print("Attempting to read CSV with pandas")
            df = pd.read_csv(file_path, header=None)
            print(f"CSV read with pandas, shape: {df.shape}")
            
            # Skip header row if it exists based on content
            if df.shape[0] > 0 and isinstance(df.iloc[0, 0], str) and (
                'date' in df.iloc[0, 0].lower() or 
                'time' in df.iloc[0, 0].lower() or
                'description' in str(df.iloc[0, 1]).lower()):
                print("Skipping header row")
                df = df.iloc[1:]
            
            # Process each row
            for _, row in df.iterrows():
                try:
                    # Create a transaction ID
                    transaction_id = str(uuid.uuid4())
                    
                    # Date is always in column 0
                    date = str(row[0]).strip('"').strip()
                    
                    # Description is always in column 1
                    description = str(row[1]).strip('"').strip()
                    
                    # Amount could be in column 2 (debit) or column 3 (credit)
                    amount = None
                    
                    # Check for debit amount (negative)
                    if pd.notna(row[2]) and str(row[2]).strip():
                        try:
                            amount_str = str(row[2]).strip('"').strip().replace(',', '')
                            amount = -1 * float(amount_str)  # Negative for debits
                            print(f"Found debit amount: {amount}")
                        except ValueError as e:
                            print(f"Invalid debit amount '{row[2]}': {e}")
                    
                    # If no debit amount, check for credit amount (positive)
                    if amount is None and len(row) > 3 and pd.notna(row[3]) and str(row[3]).strip():
                        try:
                            amount_str = str(row[3]).strip('"').strip().replace(',', '')
                            amount = float(amount_str)  # Positive for credits
                            print(f"Found credit amount: {amount}")
                        except ValueError as e:
                            print(f"Invalid credit amount '{row[3]}': {e}")
                    
                    # If neither debit nor credit, skip
                    if amount is None:
                        print(f"Skipping row, no valid amount: {row}")
                        continue
                    
                    print(f"Processing transaction: {date}, {description}, ${amount}")
                    
                    # Insert into database
                    cursor.execute(
                        'INSERT INTO transactions (id, date, description, amount, category, currency, account, memo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                        (transaction_id, date, description, amount, '', 'USD', '', '')
                    )
                    processed_rows += 1
                    
                except Exception as e:
                    print(f"Error processing row {row}: {str(e)}")
                    traceback.print_exc()
            
            # Commit the changes
            conn.commit()
            print(f"Processed {processed_rows} rows using pandas")
            return processed_rows
            
        except Exception as pandas_error:
            print(f"Failed to use pandas: {str(pandas_error)}")
            traceback.print_exc()
            
            # If pandas failed, reset counter and try the CSV module
            processed_rows = 0
            print("Falling back to CSV module...")
        
        # Read the CSV file with proper newline support
        with open(file_path, 'r', newline='', encoding='utf-8') as f:
            # First, let's examine the file structure
            file_sample = f.read(1000)  # Read a sample to examine
            print(f"File sample (first 1000 chars):\n{file_sample}")
            f.seek(0)  # Reset file pointer to beginning
            
            # Try to detect the delimiter
            dialect = csv.Sniffer().sniff(file_sample, delimiters=',;"\t')
            print(f"Detected CSV dialect: delimiter='{dialect.delimiter}', quotechar='{dialect.quotechar}'")
            
            # Try different quote settings if standard reading fails
            try:
                reader = csv.reader(f, quoting=csv.QUOTE_ALL)
                rows = list(reader)  # Convert to list to check if rows were read
                print(f"Read {len(rows)} rows with QUOTE_ALL")
                if not rows:
                    raise ValueError("No rows read with QUOTE_ALL")
            except Exception as e1:
                print(f"Failed with QUOTE_ALL: {str(e1)}")
                f.seek(0)  # Reset file pointer
                try:
                    reader = csv.reader(f, quoting=csv.QUOTE_MINIMAL)
                    rows = list(reader)
                    print(f"Read {len(rows)} rows with QUOTE_MINIMAL")
                    if not rows:
                        raise ValueError("No rows read with QUOTE_MINIMAL")
                except Exception as e2:
                    print(f"Failed with QUOTE_MINIMAL: {str(e2)}")
                    f.seek(0)  # Reset file pointer
                    reader = csv.reader(f)  # Default settings
                    rows = list(reader)
                    print(f"Read {len(rows)} rows with default settings")
            
            # Skip header row if it exists based on content
            start_idx = 0
            if len(rows) > 0 and len(rows[0]) > 0 and isinstance(rows[0][0], str) and (
                'date' in rows[0][0].lower() or 
                'time' in rows[0][0].lower() or
                (len(rows[0]) > 1 and isinstance(rows[0][1], str) and 'description' in rows[0][1].lower())):
                print("Skipping header row")
                start_idx = 1
            
            # Process the rows
            for row in rows[start_idx:]:
                try:
                    print(f"Processing row: {row}")
                    if len(row) < 3:
                        print(f"Skipping row (not enough columns): {row}")
                        continue
                    
                    # Create a transaction ID
                    transaction_id = str(uuid.uuid4())
                    
                    # Get date and description
                    date = row[0].strip()
                    description = row[1].strip()
                    
                    # First try column 2 (debit/outgoing)
                    amount = None
                    if len(row) > 2 and row[2].strip():
                        try:
                            amount_str = row[2].strip().replace(',', '')
                            amount = -1 * float(amount_str)  # Negative for debits
                            print(f"Found debit amount: {amount}")
                        except ValueError as e:
                            print(f"Invalid debit amount '{row[2]}': {e}")
                    
                    # If no amount in column 2, try column 3 (credit/incoming)
                    if amount is None and len(row) > 3 and row[3].strip():
                        try:
                            amount_str = row[3].strip().replace(',', '')
                            amount = float(amount_str)  # Positive for credits
                            print(f"Found credit amount: {amount}")
                        except ValueError as e:
                            print(f"Invalid credit amount '{row[3]}': {e}")
                    
                    # If neither debit nor credit, skip
                    if amount is None:
                        print(f"Skipping row, no valid amount: {row}")
                        continue
                    
                    print(f"Processing transaction: {date}, {description}, ${amount}")
                    
                    # Insert into database
                    cursor.execute(
                        'INSERT INTO transactions (id, date, description, amount, category, currency, account, memo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                        (transaction_id, date, description, amount, '', 'USD', '', '')
                    )
                    processed_rows += 1
                    
                except Exception as e:
                    print(f"Error processing row {row}: {str(e)}")
                    traceback.print_exc()
        
        # Commit the changes
        conn.commit()
        print(f"Processed {processed_rows} rows using CSV module")
        
    except Exception as e:
        print(f"Error reading CSV: {str(e)}")
        traceback.print_exc()
        raise
        
    finally:
        conn.close()
    
    return processed_rows

# Route to fetch transactions
@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    conn = sqlite3.connect('finance.db')
    conn.row_factory = sqlite3.Row  # This enables column access by name
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM transactions ORDER BY date DESC')
    transactions = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    
    # Return empty array with 200 status code when no transactions found
    # This allows the frontend to handle this more gracefully
    return jsonify(transactions)

# Route to update transaction category
@app.route('/api/transactions/<transaction_id>/category', methods=['PUT'])
def update_transaction_category(transaction_id):
    try:
        custom_category = request.json['custom_category']
        
        conn = sqlite3.connect('finance.db')
        cursor = conn.cursor()
        cursor.execute('UPDATE transactions SET custom_category = ? WHERE id = ?',
                    (custom_category, transaction_id))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        print(f"Error updating category: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Route to update transaction currency
@app.route('/api/transaction/<transaction_id>/currency', methods=['PUT'])
def update_transaction_currency(transaction_id):
    try:
        data = request.get_json()
        currency = data.get('currency', 'USD')
        
        if not currency:
            return jsonify({'error': 'Currency cannot be empty'}), 400
            
        conn = sqlite3.connect('finance.db')
        cursor = conn.cursor()
        
        cursor.execute(
            'UPDATE transactions SET currency = ? WHERE id = ?',
            (currency, transaction_id)
        )
        
        if cursor.rowcount == 0:
            conn.close()
            return jsonify({'error': 'Transaction not found'}), 404
            
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Currency updated successfully'})
        
    except Exception as e:
        print(f"Error updating currency: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Route to update transaction account
@app.route('/api/transaction/<transaction_id>/account', methods=['PUT'])
def update_transaction_account(transaction_id):
    try:
        data = request.get_json()
        account = data.get('account', '')
            
        conn = sqlite3.connect('finance.db')
        cursor = conn.cursor()
        
        cursor.execute(
            'UPDATE transactions SET account = ? WHERE id = ?',
            (account, transaction_id)
        )
        
        if cursor.rowcount == 0:
            conn.close()
            return jsonify({'error': 'Transaction not found'}), 404
            
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Account updated successfully'})
        
    except Exception as e:
        print(f"Error updating account: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Route to update transaction memo
@app.route('/api/transaction/<transaction_id>/memo', methods=['PUT'])
def update_transaction_memo(transaction_id):
    try:
        data = request.get_json()
        memo = data.get('memo', '')
            
        conn = sqlite3.connect('finance.db')
        cursor = conn.cursor()
        
        cursor.execute(
            'UPDATE transactions SET memo = ? WHERE id = ?',
            (memo, transaction_id)
        )
        
        if cursor.rowcount == 0:
            conn.close()
            return jsonify({'error': 'Transaction not found'}), 404
            
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Memo updated successfully'})
        
    except Exception as e:
        print(f"Error updating memo: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Route to delete all transactions
@app.route('/api/transactions/delete-all', methods=['DELETE'])
def delete_all_transactions():
    try:
        clear_transactions()
        return jsonify({"message": "All transactions successfully deleted"}), 200
    except Exception as e:
        print(f"Error deleting transactions: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Server error: {str(e)}"}), 500

# Serve frontend static files in production
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
