import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TransactionsList = ({ transactions, updateCategory, onTransactionsDeleted }) => {
  const [editingId, setEditingId] = useState(null);
  const [newCategory, setNewCategory] = useState('');
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [editingCurrencyId, setEditingCurrencyId] = useState(null);
  const [newCurrency, setNewCurrency] = useState('');
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [newAccount, setNewAccount] = useState('');
  const [editingMemoId, setEditingMemoId] = useState(null);
  const [newMemo, setNewMemo] = useState('');

  // Initialize Bootstrap dropdowns when the component mounts
  useEffect(() => {
    // Use a simple workaround to make the Edit buttons work right away
    const handleEdit = (transactionId, field, value) => {
      if (field === 'category') {
        setEditingId(transactionId);
        setNewCategory(value);
      } else if (field === 'currency') {
        setEditingCurrencyId(transactionId);
        setNewCurrency(value);
      } else if (field === 'account') {
        setEditingAccountId(transactionId);
        setNewAccount(value);
      } else if (field === 'memo') {
        setEditingMemoId(transactionId);
        setNewMemo(value);
      }
    };

    // Make this available on the window object to use directly
    window.handleTransactionEdit = handleEdit;
  }, []);

  // Get unique categories for filtering
  const allCategories = [...new Set(
    transactions
      .map(t => t.custom_category || t.category)
      .filter(Boolean)
  )];

  // Filter transactions based on search and category filter
  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = filter === '' || 
      (transaction.description && transaction.description.toLowerCase().includes(filter.toLowerCase()));
    
    const matchesCategory = categoryFilter === '' || 
      (transaction.custom_category === categoryFilter || 
       (!transaction.custom_category && transaction.category === categoryFilter));
    
    return matchesSearch && matchesCategory;
  });

  const handleCategorySubmit = (transactionId) => {
    if (newCategory.trim()) {
      updateCategory(transactionId, newCategory.trim());
      setEditingId(null);
      setNewCategory('');
    }
  };

  const handleCurrencySubmit = async (transactionId) => {
    if (newCurrency.trim()) {
      try {
        await axios.put(`/api/transaction/${transactionId}/currency`, {
          currency: newCurrency.trim()
        });
        
        // Update local state
        const updatedTransactions = transactions.map(transaction => 
          transaction.id === transactionId 
            ? { ...transaction, currency: newCurrency.trim() } 
            : transaction
        );
        
        // This will trigger a re-render with the updated currency
        if (window.updateTransactions) {
          window.updateTransactions(updatedTransactions);
        }
        
        setEditingCurrencyId(null);
        setNewCurrency('');
      } catch (error) {
        console.error('Error updating currency:', error);
      }
    }
  };

  const handleAccountSubmit = async (transactionId) => {
    try {
      await axios.put(`/api/transaction/${transactionId}/account`, {
        account: newAccount.trim()
      });
      
      // Update local state
      const updatedTransactions = transactions.map(transaction => 
        transaction.id === transactionId 
          ? { ...transaction, account: newAccount.trim() } 
          : transaction
      );
      
      // This will trigger a re-render with the updated account
      if (window.updateTransactions) {
        window.updateTransactions(updatedTransactions);
      }
      
      setEditingAccountId(null);
      setNewAccount('');
    } catch (error) {
      console.error('Error updating account:', error);
    }
  };

  const handleMemoSubmit = async (transactionId) => {
    try {
      await axios.put(`/api/transaction/${transactionId}/memo`, {
        memo: newMemo.trim()
      });
      
      // Update local state
      const updatedTransactions = transactions.map(transaction => 
        transaction.id === transactionId 
          ? { ...transaction, memo: newMemo.trim() } 
          : transaction
      );
      
      // This will trigger a re-render with the updated memo
      if (window.updateTransactions) {
        window.updateTransactions(updatedTransactions);
      }
      
      setEditingMemoId(null);
      setNewMemo('');
    } catch (error) {
      console.error('Error updating memo:', error);
    }
  };

  const formatAmount = (amount, currency = 'USD') => {
    // Convert to positive for display (Plaid amounts are positive for debits)
    const absAmount = Math.abs(amount);
    
    // Format based on currency
    switch(currency) {
      case 'EUR':
        return `€${absAmount.toFixed(2)}`;
      case 'GBP':
        return `£${absAmount.toFixed(2)}`;
      case 'JPY':
        return `¥${Math.round(absAmount)}`;
      case 'CAD':
      case 'AUD':
        return `$${absAmount.toFixed(2)} ${currency}`;
      default:
        return `$${absAmount.toFixed(2)}`;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const handleDeleteAllTransactions = async () => {
    if (window.confirm('Are you sure you want to delete ALL transactions? This action cannot be undone.')) {
      setIsDeleting(true);
      setDeleteError(null);
      
      try {
        await axios.delete('/api/transactions/delete-all');
        setIsDeleting(false);
        if (onTransactionsDeleted) {
          onTransactionsDeleted();
        } else {
          // Fallback if no callback provided
          window.location.reload();
        }
      } catch (error) {
        console.error('Error deleting transactions:', error);
        setDeleteError('Failed to delete transactions. Please try again.');
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="transactions-list">
      <div className="filters mb-4">
        <div className="row">
          <div className="col-md-6 mb-3">
            <input
              type="text"
              className="form-control"
              placeholder="Search transactions..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <div className="col-md-6 mb-3">
            <select
              className="form-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              {allCategories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {deleteError && (
        <div className="alert alert-danger" role="alert">
          {deleteError}
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>Transactions ({filteredTransactions.length})</h4>
        <button 
          className="btn btn-danger" 
          onClick={handleDeleteAllTransactions}
          disabled={isDeleting || transactions.length === 0}
        >
          {isDeleting ? 'Deleting...' : 'Delete All Transactions'}
        </button>
      </div>

      {filteredTransactions.length === 0 ? (
        <p>No transactions found.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover">
            <thead className="table-light">
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Currency</th>
                <th>Account</th>
                <th>Memo</th>
                <th>Category</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map(transaction => (
                <tr key={transaction.id}>
                  <td>{formatDate(transaction.date)}</td>
                  <td>{transaction.description}</td>
                  <td className={transaction.amount > 0 ? 'transaction-amount-negative' : 'transaction-amount-positive'}>
                    {formatAmount(transaction.amount, transaction.currency)}
                  </td>
                  <td>
                    {editingCurrencyId === transaction.id ? (
                      <div className="input-group input-group-sm">
                        <select
                          className="form-select form-select-sm"
                          value={newCurrency}
                          onChange={(e) => setNewCurrency(e.target.value)}
                          autoFocus
                        >
                          <option value="">Select currency</option>
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="GBP">GBP</option>
                          <option value="JPY">JPY</option>
                          <option value="CAD">CAD</option>
                          <option value="AUD">AUD</option>
                        </select>
                        <button 
                          className="btn btn-success btn-sm" 
                          onClick={() => handleCurrencySubmit(transaction.id)}
                        >
                          Save
                        </button>
                        <button 
                          className="btn btn-outline-secondary btn-sm" 
                          onClick={() => {
                            setEditingCurrencyId(null);
                            setNewCurrency('');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <span>{transaction.currency || 'USD'}</span>
                    )}
                  </td>
                  <td>
                    {editingAccountId === transaction.id ? (
                      <div className="input-group input-group-sm">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={newAccount}
                          onChange={(e) => setNewAccount(e.target.value)}
                          placeholder="Enter account"
                          autoFocus
                        />
                        <button 
                          className="btn btn-success btn-sm" 
                          onClick={() => handleAccountSubmit(transaction.id)}
                        >
                          Save
                        </button>
                        <button 
                          className="btn btn-outline-secondary btn-sm" 
                          onClick={() => {
                            setEditingAccountId(null);
                            setNewAccount('');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <span>{transaction.account || '-'}</span>
                    )}
                  </td>
                  <td>
                    {editingMemoId === transaction.id ? (
                      <div className="input-group input-group-sm">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={newMemo}
                          onChange={(e) => setNewMemo(e.target.value)}
                          placeholder="Enter memo"
                          autoFocus
                        />
                        <button 
                          className="btn btn-success btn-sm" 
                          onClick={() => handleMemoSubmit(transaction.id)}
                        >
                          Save
                        </button>
                        <button 
                          className="btn btn-outline-secondary btn-sm" 
                          onClick={() => {
                            setEditingMemoId(null);
                            setNewMemo('');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <span>{transaction.memo || '-'}</span>
                    )}
                  </td>
                  <td>
                    {editingId === transaction.id ? (
                      <div className="input-group input-group-sm">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          placeholder="Enter category"
                          autoFocus
                        />
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleCategorySubmit(transaction.id)}
                        >
                          Save
                        </button>
                        <button
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => {
                            setEditingId(null);
                            setNewCategory('');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : transaction.custom_category ? (
                      <span className="badge bg-info">{transaction.custom_category}</span>
                    ) : transaction.category ? (
                      <span className="badge bg-secondary">{transaction.category}</span>
                    ) : (
                      <span className="text-muted">Uncategorized</span>
                    )}
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <button 
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => {
                          setEditingId(transaction.id);
                          setNewCategory(transaction.custom_category || transaction.category || '');
                        }}
                      >
                        <small>Category</small>
                      </button>
                      <button 
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => {
                          setEditingCurrencyId(transaction.id);
                          setNewCurrency(transaction.currency || 'USD');
                        }}
                      >
                        <small>Currency</small>
                      </button>
                      <button 
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => {
                          setEditingAccountId(transaction.id);
                          setNewAccount(transaction.account || '');
                        }}
                      >
                        <small>Account</small>
                      </button>
                      <button 
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => {
                          setEditingMemoId(transaction.id);
                          setNewMemo(transaction.memo || '');
                        }}
                      >
                        <small>Memo</small>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TransactionsList;
