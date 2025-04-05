import os
import csv
import sqlite3
import uuid

def process_account_activity_csv(file_path):
    """Custom function to process accountactivity.csv format"""
    print(f"Processing account activity CSV: {file_path}")
    
    # Connect to database
    conn = sqlite3.connect('finance.db')
    cursor = conn.cursor()
    
    processed_rows = 0
    
    try:
        # Read the CSV file with proper newline support
        with open(file_path, 'r', newline='') as f:
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
        
    except Exception as e:
        print(f"Error reading CSV: {str(e)}")
        raise
        
    finally:
        conn.close()
    
    return processed_rows

if __name__ == "__main__":
    example_file_path = os.path.join(os.getcwd(), 'accountactivity.csv')
    if not os.path.exists(example_file_path):
        print(f"Example file not found at {example_file_path}")
    else:
        try:
            rows = process_account_activity_csv(example_file_path)
            print(f"Successfully processed {rows} rows from example file")
        except Exception as e:
            print(f"Error processing example file: {str(e)}")
