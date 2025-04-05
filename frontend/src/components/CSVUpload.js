import React, { useState } from 'react';
import axios from 'axios';
import '../App.css';

const CSVUpload = ({ onSuccess }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
    setError(null); // Clear any previous errors
    setDebugInfo(null); // Clear any previous debug info
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setDebugInfo(null);
    
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
      console.log('Making POST request to /api/upload_csv');
      const response = await axios.post('/api/upload_csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('Upload successful:', response.data);
      setIsUploading(false);
      setSelectedFile(null);
      
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
      
      console.error('Error details:', debugDetails);
      setError(errorMessage);
      setDebugInfo(debugDetails);
    }
  };

  const handleUseExampleFile = async () => {
    setIsUploading(true);
    setError(null);
    setDebugInfo(null);
    
    try {
      // Create a FormData object
      const formData = new FormData();
      formData.append('use_example', 'true');
      
      console.log('Making POST request to use example file');
      console.log('FormData content:', Array.from(formData.entries()));
      
      const response = await axios.post('/api/upload_csv', formData);
      
      console.log('Example file upload successful:', response.data);
      setIsUploading(false);
      
      // Call the success callback
      if (onSuccess) onSuccess();
      
    } catch (err) {
      setIsUploading(false);
      
      console.error('Example file upload error:', err);
      
      // Get detailed error information
      let errorMessage = 'Error using example file. Please check server logs.';
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
      
      console.error('Error details:', debugDetails);
      setError(errorMessage);
      setDebugInfo(debugDetails);
    }
  };

  return (
    <div className="csv-upload">
      <div className="file-input-container">
        <input
          type="file"
          id="csv-file-input"
          onChange={handleFileChange}
          accept=".csv"
          disabled={isUploading}
        />
        <button 
          onClick={handleUpload} 
          disabled={!selectedFile || isUploading}
          className="upload-btn"
        >
          {isUploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>
      
      <div className="example-file">
        <p>Or use our example file:</p>
        <button 
          onClick={handleUseExampleFile}
          disabled={isUploading}
          className="example-btn"
        >
          {isUploading ? 'Loading...' : 'Use Example File'}
        </button>
      </div>
      
      {error && <div className="error-message" data-component-name="CSVUpload">{error}</div>}
      
      {debugInfo && (
        <div className="debug-info" style={{marginTop: '10px', fontSize: '12px', color: '#666', whiteSpace: 'pre-wrap', maxHeight: '100px', overflowY: 'auto'}}>
          <strong>Debug Info:</strong><br/>
          {debugInfo}
        </div>
      )}
    </div>
  );
};

export default CSVUpload;
