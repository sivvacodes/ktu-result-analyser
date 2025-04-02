import React from 'react';
import { FaFileExcel } from 'react-icons/fa';

const ExcelButton = ({ loading, onClick, error, onErrorClose }) => {
  return (
    <div className="excel-container">
      <button 
        className={`excel-btn ${loading ? 'loading' : ''}`}
        onClick={onClick}
        disabled={loading}
      >
        <FaFileExcel />
        <span>{loading ? 'Generating...' : 'Generate Excel'}</span>
      </button>
      
      {error && (
        <div className="error-tooltip">
          <span className="error-message">{error}</span>
          <button className="retry-button" onClick={onClick}>
            Try Again
          </button>
          <button className="close-button" onClick={onErrorClose}>
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default ExcelButton; 