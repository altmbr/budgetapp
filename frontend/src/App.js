import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import CSVUpload from './components/CSVUpload';
import TransactionsList from './components/TransactionsList';

function App() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

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
    
    // Add updateTransactions function to window object for use in child components
    window.updateTransactions = (updatedTransactions) => {
      setTransactions(updatedTransactions);
    };
    
    // Cleanup when component unmounts
    return () => {
      delete window.updateTransactions;
    };
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
    setShowUploadModal(false);
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
        <div className="header-content">
          <h1>Personal Finance</h1>
          <button 
            className="import-button" 
            onClick={() => setShowUploadModal(true)}
          >
            Import
          </button>
        </div>
      </header>
      
      <main className="app-main">
        {showUploadModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2>Import Transactions</h2>
                <button 
                  className="close-button" 
                  onClick={() => setShowUploadModal(false)}
                >
                  &times;
                </button>
              </div>
              <CSVUpload onSuccess={handleUploadSuccess} />
            </div>
          </div>
        )}
        
        <section className="transactions-section">
          <TransactionsList 
            transactions={transactions} 
            updateCategory={updateTransactionCategory}
            onTransactionsDeleted={handleTransactionsDeleted}
          />
        </section>
      </main>
    </div>
  );
}

export default App;
