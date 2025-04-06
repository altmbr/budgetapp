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
  const [sortConfig, setSortConfig] = useState({
    key: 'date',
    direction: 'descending'
  });
  const [columnFilters, setColumnFilters] = useState({});
  const [showFilterMenu, setShowFilterMenu] = useState(null);
  const [tempFilterValue, setTempFilterValue] = useState('');

  useEffect(() => {
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

    window.handleTransactionEdit = handleEdit;
    
    const handleClickOutside = (event) => {
      if (showFilterMenu && !event.target.closest('.filter-menu') && 
          !event.target.closest('.filter-button')) {
        setShowFilterMenu(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterMenu]);

  const allCategories = [...new Set(
    transactions
      .map(t => t.custom_category || t.category)
      .filter(Boolean)
  )];
  
  const getUniqueColumnValues = (columnKey) => {
    const values = transactions.map(t => {
      if (columnKey === 'category') {
        return t.custom_category || t.category || 'Uncategorized';
      }
      return t[columnKey] || '';
    });
    
    return [...new Set(values)].filter(Boolean).sort();
  };

  const addColumnFilter = (column, value) => {
    setColumnFilters(prev => ({
      ...prev,
      [column]: value
    }));
    setShowFilterMenu(null);
    setTempFilterValue('');
  };

  const removeColumnFilter = (column) => {
    setColumnFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[column];
      return newFilters;
    });
  };

  const clearAllFilters = () => {
    setColumnFilters({});
    setFilter('');
    setCategoryFilter('');
  };

  const requestSort = (key) => {
    let direction = 'ascending';
    
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    
    setSortConfig({ key, direction });
  };

  const getSortedTransactions = (transactionsToSort) => {
    const sortableTransactions = [...transactionsToSort];
    if (sortConfig.key) {
      sortableTransactions.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        
        if (sortConfig.key === 'category') {
          aValue = a.custom_category || a.category || '';
          bValue = b.custom_category || b.category || '';
        }
        
        if (aValue === null || aValue === undefined) aValue = '';
        if (bValue === null || bValue === undefined) bValue = '';
        
        if (sortConfig.key === 'amount') {
          return sortConfig.direction === 'ascending' 
            ? parseFloat(aValue) - parseFloat(bValue)
            : parseFloat(bValue) - parseFloat(aValue);
        }
        
        if (sortConfig.key === 'date') {
          const dateA = new Date(aValue);
          const dateB = new Date(bValue);
          return sortConfig.direction === 'ascending' 
            ? dateA - dateB 
            : dateB - dateA;
        }
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'ascending' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        
        return sortConfig.direction === 'ascending' 
          ? (aValue > bValue ? 1 : -1)
          : (bValue > aValue ? 1 : -1);
      });
    }
    return sortableTransactions;
  };
  
  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = filter === '' || 
      (transaction.description && transaction.description.toLowerCase().includes(filter.toLowerCase()));
    
    const matchesCategory = categoryFilter === '' || 
      (transaction.custom_category === categoryFilter || 
       (!transaction.custom_category && transaction.category === categoryFilter));
    
    const matchesColumnFilters = Object.entries(columnFilters).every(([column, filterValue]) => {
      if (column === 'category') {
        const categoryValue = transaction.custom_category || transaction.category || 'Uncategorized';
        return categoryValue === filterValue;
      }
      
      if (column === 'amount') {
        const numericFilter = parseFloat(filterValue);
        if (!isNaN(numericFilter)) {
          if (filterValue.startsWith('>')) {
            return transaction.amount > parseFloat(filterValue.substring(1));
          } else if (filterValue.startsWith('<')) {
            return transaction.amount < parseFloat(filterValue.substring(1));
          } else {
            return transaction.amount === numericFilter;
          }
        }
        return true;
      }
      
      const transactionValue = transaction[column] || '';
      return transactionValue.toLowerCase().includes(filterValue.toLowerCase());
    });
    
    return matchesSearch && matchesCategory && matchesColumnFilters;
  });

  const sortedAndFilteredTransactions = getSortedTransactions(filteredTransactions);

  const SortIndicator = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return <span className="sort-indicator">⇵</span>;
    }
    
    return (
      <span className="sort-indicator">
        {sortConfig.direction === 'ascending' ? '↑' : '↓'}
      </span>
    );
  };
  
  const FilterMenu = ({ column, onClose }) => {
    const uniqueValues = getUniqueColumnValues(column);
    
    return (
      <div className="filter-menu">
        <div className="filter-menu-header">
          <h4>Filter {column}</h4>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="filter-menu-content">
          <input
            type="text"
            placeholder={`Search ${column}...`}
            value={tempFilterValue}
            onChange={(e) => setTempFilterValue(e.target.value)}
            className="filter-search"
          />
          <div className="filter-options">
            {uniqueValues
              .filter(value => value.toLowerCase().includes(tempFilterValue.toLowerCase()))
              .map((value, index) => (
                <div 
                  key={index} 
                  className="filter-option"
                  onClick={() => addColumnFilter(column, value)}
                >
                  {value}
                </div>
              ))
            }
            {column === 'amount' && (
              <div className="amount-filter-helpers">
                <button onClick={() => addColumnFilter(column, '>0')}>Greater than 0</button>
                <button onClick={() => addColumnFilter(column, '<0')}>Less than 0</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  const FilterButton = ({ column }) => {
    const isFiltered = column in columnFilters;
    
    return (
      <button 
        className={`filter-button ${isFiltered ? 'active' : ''}`}
        onClick={(e) => {
          e.stopPropagation();  
          setShowFilterMenu(showFilterMenu === column ? null : column);
        }}
      >
        <span className="filter-icon">🔍</span>
      </button>
    );
  };

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
        
        const updatedTransactions = transactions.map(transaction => 
          transaction.id === transactionId 
            ? { ...transaction, currency: newCurrency.trim() } 
            : transaction
        );
        
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
      
      const updatedTransactions = transactions.map(transaction => 
        transaction.id === transactionId 
          ? { ...transaction, account: newAccount.trim() } 
          : transaction
      );
      
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
      
      const updatedTransactions = transactions.map(transaction => 
        transaction.id === transactionId 
          ? { ...transaction, memo: newMemo.trim() } 
          : transaction
      );
      
      if (window.updateTransactions) {
        window.updateTransactions(updatedTransactions);
      }
      
      setEditingMemoId(null);
      setNewMemo('');
    } catch (error) {
      console.error('Error updating memo:', error);
    }
  };

  const handleDeleteAllTransactions = async () => {
    if (window.confirm('Are you sure you want to delete all transactions? This cannot be undone.')) {
      setIsDeleting(true);
      setDeleteError(null);
      
      try {
        await axios.delete('/api/transactions/delete-all');
        setIsDeleting(false);
        
        if (onTransactionsDeleted) {
          onTransactionsDeleted();
        }
      } catch (error) {
        console.error('Error deleting transactions:', error);
        setDeleteError('Failed to delete transactions.');
        setIsDeleting(false);
      }
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="empty-state">
        <p>No transactions to display. Upload a CSV file to get started.</p>
      </div>
    );
  }

  return (
    <div className="transactions-list">
      <div className="transactions-header">
        <h2>Your Transactions</h2>
        <div className="header-actions">
          <button className="action-icon-button add-button">
            <span>+</span>
          </button>
          <button 
            className="action-icon-button delete-all-button" 
            onClick={handleDeleteAllTransactions}
            disabled={isDeleting}
          >
            <span aria-hidden="true">🗑️</span>
          </button>
        </div>
      </div>
      
      <div className="transactions-controls">
        <div className="search-container">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search transactions..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-container">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Categories</option>
            {allCategories.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          
          {Object.keys(columnFilters).length > 0 && (
            <button 
              className="clear-filters-button"
              onClick={clearAllFilters}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>
      
      {Object.keys(columnFilters).length > 0 && (
        <div className="column-filters">
          {Object.entries(columnFilters).map(([column, value]) => (
            <div key={column} className="column-filter-item">
              <span className="column-filter-label">{column}:</span>
              <span className="column-filter-value">{value}</span>
              <span 
                className="column-filter-remove" 
                onClick={() => removeColumnFilter(column)}
              >
                ×
              </span>
            </div>
          ))}
        </div>
      )}
      
      <div className="transaction-count">
        {sortedAndFilteredTransactions.length.toLocaleString()} transactions
      </div>
      
      <div className="transactions-table-container">
        <table className="transactions-table">
          <thead>
            <tr>
              <th onClick={() => requestSort('date')} className="sortable-header">
                Date <SortIndicator columnKey="date" />
                <FilterButton column="date" />
                {showFilterMenu === 'date' && (
                  <FilterMenu column="date" onClose={() => setShowFilterMenu(null)} />
                )}
              </th>
              <th onClick={() => requestSort('description')} className="sortable-header">
                Description <SortIndicator columnKey="description" />
                <FilterButton column="description" />
                {showFilterMenu === 'description' && (
                  <FilterMenu column="description" onClose={() => setShowFilterMenu(null)} />
                )}
              </th>
              <th onClick={() => requestSort('amount')} className="sortable-header">
                Amount <SortIndicator columnKey="amount" />
                <FilterButton column="amount" />
                {showFilterMenu === 'amount' && (
                  <FilterMenu column="amount" onClose={() => setShowFilterMenu(null)} />
                )}
              </th>
              <th onClick={() => requestSort('currency')} className="sortable-header">
                Currency <SortIndicator columnKey="currency" />
                <FilterButton column="currency" />
                {showFilterMenu === 'currency' && (
                  <FilterMenu column="currency" onClose={() => setShowFilterMenu(null)} />
                )}
              </th>
              <th onClick={() => requestSort('account')} className="sortable-header">
                Account <SortIndicator columnKey="account" />
                <FilterButton column="account" />
                {showFilterMenu === 'account' && (
                  <FilterMenu column="account" onClose={() => setShowFilterMenu(null)} />
                )}
              </th>
              <th onClick={() => requestSort('memo')} className="sortable-header">
                Memo <SortIndicator columnKey="memo" />
                <FilterButton column="memo" />
                {showFilterMenu === 'memo' && (
                  <FilterMenu column="memo" onClose={() => setShowFilterMenu(null)} />
                )}
              </th>
              <th onClick={() => requestSort('category')} className="sortable-header">
                Category <SortIndicator columnKey="category" />
                <FilterButton column="category" />
                {showFilterMenu === 'category' && (
                  <FilterMenu column="category" onClose={() => setShowFilterMenu(null)} />
                )}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedAndFilteredTransactions.map(transaction => (
              <tr key={transaction.id}>
                <td>{transaction.date}</td>
                <td>{transaction.description}</td>
                <td className={transaction.amount < 0 ? 'transaction-amount-negative' : 'transaction-amount-positive'}>
                  {(transaction.amount < 0 ? '-' : '') + '$' + Math.abs(transaction.amount).toFixed(2)}
                </td>
                <td>
                  {editingCurrencyId === transaction.id ? (
                    <div>
                      <input
                        type="text"
                        value={newCurrency}
                        onChange={(e) => setNewCurrency(e.target.value)}
                        onBlur={() => handleCurrencySubmit(transaction.id)}
                        onKeyPress={(e) => e.key === 'Enter' && handleCurrencySubmit(transaction.id)}
                        autoFocus
                      />
                    </div>
                  ) : (
                    <span onClick={() => {
                      setEditingCurrencyId(transaction.id);
                      setNewCurrency(transaction.currency || '');
                    }}>
                      {transaction.currency || 'USD'}
                    </span>
                  )}
                </td>
                <td>
                  {editingAccountId === transaction.id ? (
                    <div>
                      <input
                        type="text"
                        value={newAccount}
                        onChange={(e) => setNewAccount(e.target.value)}
                        onBlur={() => handleAccountSubmit(transaction.id)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAccountSubmit(transaction.id)}
                        autoFocus
                      />
                    </div>
                  ) : (
                    <span onClick={() => {
                      setEditingAccountId(transaction.id);
                      setNewAccount(transaction.account || '');
                    }}>
                      {transaction.account || '-'}
                    </span>
                  )}
                </td>
                <td>
                  {editingMemoId === transaction.id ? (
                    <div>
                      <input
                        type="text"
                        value={newMemo}
                        onChange={(e) => setNewMemo(e.target.value)}
                        onBlur={() => handleMemoSubmit(transaction.id)}
                        onKeyPress={(e) => e.key === 'Enter' && handleMemoSubmit(transaction.id)}
                        autoFocus
                      />
                    </div>
                  ) : (
                    <span onClick={() => {
                      setEditingMemoId(transaction.id);
                      setNewMemo(transaction.memo || '');
                    }}>
                      {transaction.memo || '-'}
                    </span>
                  )}
                </td>
                <td>
                  {editingId === transaction.id ? (
                    <div>
                      <input
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        onBlur={() => handleCategorySubmit(transaction.id)}
                        onKeyPress={(e) => e.key === 'Enter' && handleCategorySubmit(transaction.id)}
                        autoFocus
                      />
                    </div>
                  ) : (
                    <span 
                      className="category-badge"
                      onClick={() => {
                        setEditingId(transaction.id);
                        setNewCategory(transaction.custom_category || transaction.category || '');
                      }}
                    >
                      {transaction.custom_category || transaction.category || 'Uncategorized'}
                    </span>
                  )}
                </td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="action-button category-button"
                      onClick={() => {
                        setEditingId(transaction.id);
                        setNewCategory(transaction.custom_category || transaction.category || '');
                      }}
                    >
                      Category
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {deleteError && (
        <div className="error-message">{deleteError}</div>
      )}
    </div>
  );
};

export default TransactionsList;
