# Simple Personal Finance App

A basic personal finance application that allows you to:
- Upload your financial transactions from a CSV file
- View your transactions
- Tag/categorize transactions
- Save your categorizations

## Setup

### Backend Setup
1. Install Python dependencies:
```
pip install -r requirements.txt
```

2. Run the Flask backend:
```
python app.py
```

### Frontend Setup
1. Install Node.js dependencies:
```
cd frontend
npm install
```

2. Run the React frontend:
```
npm start
```

## Usage
1. Open your browser to http://localhost:3000
2. Upload a CSV file with your transaction data
   - The CSV must include columns for: date, description, and amount
   - An optional category column is also supported
3. View and categorize your transactions

## CSV Format
Your CSV file should include the following columns:
- `date`: The date of the transaction
- `description`: The merchant name or transaction description
- `amount`: The transaction amount (positive for income, negative for expenses)
- `category`: (Optional) Initial category assigned to the transaction

Most bank exports should be compatible, but you might need to rename the columns to match these names.
