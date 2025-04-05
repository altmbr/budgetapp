import csv
import sqlite3
import os
import uuid

def reset_database():
    # Connect to database
    conn = sqlite3.connect('finance.db')
    cursor = conn.cursor()
    
    # Reset the transactions table
    cursor.execute('DROP TABLE IF EXISTS transactions')
    cursor.execute('''
    CREATE TABLE transactions (
        id TEXT PRIMARY KEY,
        date TEXT,
        description TEXT,
        amount REAL,
        category TEXT,
        custom_category TEXT
    )
    ''')
    conn.commit()
    conn.close()
    print("Database reset complete")

def process_csv():
    # Path to the CSV file
    file_path = os.path.join(os.getcwd(), 'accountactivity.csv')
    
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        return
    
    print("File exists, proceeding with processing")
    
    # Print file contents for debugging
    with open(file_path, 'r') as f:
        content = f.read()
        print(f"File contents:\n{content}")
    
    # Connect to database
    conn = sqlite3.connect('finance.db')
    cursor = conn.cursor()
    
    processed_rows = 0
    
    try:
        # Parse CSV with different quoting options
        with open(file_path, 'r') as f:
            reader = csv.reader(f, quoting=csv.QUOTE_ALL)
            
            for row in reader:
                try:
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
                    if row[2].strip():
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
                        'INSERT INTO transactions (id, date, description, amount, category) VALUES (?, ?, ?, ?, ?)',
                        (transaction_id, date, description, amount, '')
                    )
                    processed_rows += 1
                    
                except Exception as e:
                    print(f"Error processing row {row}: {str(e)}")
        
        # Commit the changes
        conn.commit()
        print(f"Processed {processed_rows} rows")
        
        # Verify data was inserted
        cursor.execute('SELECT COUNT(*) FROM transactions')
        count = cursor.fetchone()[0]
        print(f"Total transactions in database: {count}")
        
        # Show the first few transactions
        cursor.execute('SELECT * FROM transactions LIMIT 5')
        print("\nSample transactions:")
        for row in cursor.fetchall():
            print(row)
        
    except Exception as e:
        print(f"Error processing CSV: {str(e)}")
        
    finally:
        conn.close()

if __name__ == "__main__":
    print("Starting direct test script")
    reset_database()
    process_csv()
    print("Test complete")
