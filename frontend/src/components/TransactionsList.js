import React, { useState } from 'react';
import axios from 'axios';

const TransactionsList = ({ transactions, updateCategory, onTransactionsDeleted }) => {
  const [editingId, setEditingId] = useState(null);
  const [newCategory, setNewCategory] = useState('');
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

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

  const formatAmount = (amount) => {
    // Convert to positive for display (Plaid amounts are positive for debits)
    const absAmount = Math.abs(amount);
    return `$${absAmount.toFixed(2)}`;
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
                    {formatAmount(transaction.amount)}
                  </td>
                  <td>
                    {transaction.custom_category ? (
                      <span className="badge bg-info">{transaction.custom_category}</span>
                    ) : transaction.category ? (
                      <span className="badge bg-secondary">{transaction.category}</span>
                    ) : (
                      <span className="text-muted">Uncategorized</span>
                    )}
                  </td>
                  <td>
                    {editingId === transaction.id ? (
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          placeholder="Enter category"
                        />
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => handleCategorySubmit(transaction.id)}
                        >
                          Save
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => {
                            setEditingId(null);
                            setNewCategory('');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => {
                          setEditingId(transaction.id);
                          setNewCategory(transaction.custom_category || '');
                        }}
                      >
                        Categorize
                      </button>
                    )}
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
