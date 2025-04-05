import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import CSVUpload from './components/CSVUpload';
import TransactionsList from './components/TransactionsList';

function App() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch transactions from the backend
  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await axios.get('/api/transactions');
        setTransactions(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError('Error fetching transactions');
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  // Function to fetch transactions
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/transactions');
      setTransactions(response.data);
      setLoading(false);
    } catch (err) {
      setError('Error fetching transactions');
      setLoading(false);
    }
  };
  
  // Called when CSV upload is successful
  const handleUploadSuccess = () => {
    fetchTransactions();
  };

  // Called when all transactions are deleted
  const handleTransactionsDeleted = () => {
    setTransactions([]);
    setError(null);
  };

  const updateTransactionCategory = async (transactionId, category) => {
    try {
      await axios.put(`/api/transactions/${transactionId}/category`, {
        custom_category: category
      });
      
      // Update local state
      setTransactions(prevTransactions => 
        prevTransactions.map(transaction => 
          transaction.id === transactionId 
            ? { ...transaction, custom_category: category } 
            : transaction
        )
      );
    } catch (err) {
      setError('Error updating category');
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Personal Finance</h1>
      </header>
      
      <main className="app-main">
        <section className="upload-section">
          <h2>Upload Your Transaction Data</h2>
          <p>Upload a CSV file with your transaction data to get started</p>
          
          <CSVUpload onSuccess={handleUploadSuccess} />
        </section>
        
        {transactions.length > 0 && (
          <section className="transactions-section">
            <h2>Your Transactions</h2>
            <TransactionsList 
              transactions={transactions} 
              updateCategory={updateTransactionCategory}
              onTransactionsDeleted={handleTransactionsDeleted}
            />
          </section>
        )}
        
        {loading && <div className="loading">Loading transactions...</div>}
        
        {/* Only show error if it exists AND we already have transactions */}
        {error && transactions.length > 0 && (
          <div className="alert alert-danger" data-component-name="App">{error}</div>
        )}
      </main>
      
      <footer>
        <p> 2025 Personal Finance App</p>
      </footer>
    </div>
  );
}

export default App;
