import React, { useState } from 'react';
import axios from 'axios';
import '../App.css';

const CSVUpload = ({ onSuccess }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
    setError(null); // Clear any previous errors
    setDebugInfo(null); // Clear any previous debug info
    setUploadResult(null); // Clear any previous upload results
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setDebugInfo(null);
    setUploadResult(null);
    
    // Debug info about the file
    const fileInfo = {
      name: selectedFile.name,
      type: selectedFile.type,
      size: selectedFile.size,
      lastModified: new Date(selectedFile.lastModified).toISOString()
    };
    setDebugInfo(`File info: ${JSON.stringify(fileInfo)}`);
    console.log('Uploading file:', fileInfo);
    
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      console.log('Making POST request to /api/upload-csv');
      const response = await axios.post('/api/upload-csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('Upload successful:', response.data);
      setIsUploading(false);
      setSelectedFile(null);
      setUploadResult(response.data.message);
      
      // Reset the file input
      const fileInput = document.getElementById('csv-file-input');
      if (fileInput) fileInput.value = '';
      
      // Call the success callback
      if (onSuccess) onSuccess();
      
    } catch (err) {
      setIsUploading(false);
      
      console.error('Upload error:', err);
      
      // Get detailed error information
      let errorMessage = 'Error uploading file. Please check server logs.';
      let debugDetails = '';
      
      if (err.response) {
        // Server responded with an error
        debugDetails = `Status: ${err.response.status}, Data: ${JSON.stringify(err.response.data)}`;
        errorMessage = err.response.data?.error || errorMessage;
      } else if (err.request) {
        // Request was made but no response received
        debugDetails = 'No response received from server';
        errorMessage = 'Server did not respond. Is the backend running?';
      } else {
        // Something else caused the error
        debugDetails = err.message;
        errorMessage = 'Error setting up request: ' + err.message;
      }
      
      setError(errorMessage);
      setDebugInfo(debugDetails);
    }
  };

  const handleUseExample = async () => {
    setIsUploading(true);
    setError(null);
    setDebugInfo(null);
    setUploadResult(null);
    
    try {
      console.log('Using example file');
      const formData = new FormData();
      formData.append('use_example', 'true');
      
      const response = await axios.post('/api/process-example', formData);
      
      console.log('Example file processed:', response.data);
      setIsUploading(false);
      setUploadResult(response.data.message);
      
      // Call the success callback
      if (onSuccess) onSuccess();
      
    } catch (err) {
      setIsUploading(false);
      
      console.error('Example file error:', err);
      
      // Get detailed error information
      let errorMessage = 'Error processing example file.';
      let debugDetails = '';
      
      if (err.response) {
        debugDetails = `Status: ${err.response.status}, Data: ${JSON.stringify(err.response.data)}`;
        errorMessage = err.response.data?.error || errorMessage;
      } else if (err.request) {
        debugDetails = 'No response received from server';
        errorMessage = 'Server did not respond. Is the backend running?';
      } else {
        debugDetails = err.message;
        errorMessage = 'Error setting up request: ' + err.message;
      }
      
      setError(errorMessage);
      setDebugInfo(debugDetails);
    }
  };

  return (
    <div className="csv-upload">
      <h3>Upload Transactions</h3>
      
      <div className="csv-format-info alert alert-info">
        <h5>Supported File Formats:</h5>
        <ul>
          <li>Standard CSV with date, description, and amount columns</li>
          <li>CSV with debit/credit columns</li>
          <li>Budget format with Outflow/Inflow columns</li>
        </ul>
      </div>
      
      <div className="upload-controls">
        <div className="mb-3">
          <label htmlFor="csv-file-input" className="form-label">Select CSV file:</label>
          <input 
            type="file" 
            className="form-control" 
            id="csv-file-input" 
            accept=".csv" 
            onChange={handleFileChange} 
            disabled={isUploading}
          />
        </div>
        
        <div className="d-flex gap-2 mb-3">
          <button 
            className="btn btn-primary" 
            onClick={handleUpload} 
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? 'Uploading...' : 'Upload File'}
          </button>
          
          <button 
            className="btn btn-outline-secondary" 
            onClick={handleUseExample} 
            disabled={isUploading}
          >
            Use Example File
          </button>
        </div>
      </div>
      
      {uploadResult && (
        <div className="alert alert-success">
          <strong>Success!</strong> {uploadResult}
        </div>
      )}
      
      {error && (
        <div className="alert alert-danger">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {debugInfo && (
        <div className="debug-info">
          <h5>Debug Information</h5>
          <pre>{debugInfo}</pre>
        </div>
      )}
    </div>
  );
};

export default CSVUpload;
