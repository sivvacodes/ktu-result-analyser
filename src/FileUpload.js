import React, { useState } from "react";
import './FileUpload.css';  // We'll create this next

const FileUpload = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Add API URL as a constant
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a PDF file first");
      return;
    }

    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);

    try {
      console.log("Attempting to connect to server at:", API_URL);
      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
        mode: 'cors',
      }).catch(error => {
        console.log("Fetch failed:", error);
        throw new Error(`Connection failed: Is the server running at ${API_URL}?`);
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Server response:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData || `HTTP error! status: ${response.status}`);
      }

      console.log("Response received, processing blob...");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      // Give a clear filename with timestamp
      a.download = `results_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      setFile(null); // Reset file input after successful download
    } catch (error) {
      console.error("Error details:", error);
      setError(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-container">
      <div className="upload-card">
        <h1 className="title">KTU Results Analyzer</h1>
        <p className="subtitle">Upload PDF results to generate Excel analysis</p>
        
        <form onSubmit={handleSubmit} className="upload-form">
          <div className="file-input-container">
            <input 
              type="file" 
              accept=".pdf" 
              onChange={handleFileChange} 
              className="file-input"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="file-label">
              {file ? file.name : 'Choose PDF File'}
            </label>
          </div>

          <button 
            type="submit" 
            disabled={loading || !file} 
            className={`submit-button ${loading ? 'loading' : ''}`}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Processing...
              </>
            ) : (
              'Generate Excel'
            )}
          </button>
        </form>

        {error && (
          <div className="error-message">
            <i className="error-icon">⚠️</i>
            {error}
          </div>
        )}

        <div className="instructions">
          <h2>Instructions:</h2>
          <ol>
            <li>Upload KTU results PDF file</li>
            <li>Wait for processing to complete</li>
            <li>Excel file will download automatically</li>
            <li>Check the analysis in downloaded file</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;