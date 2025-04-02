import React, { useState } from 'react';
import { FaFileUpload, FaFileExcel } from 'react-icons/fa';
import './styles/App.css';
import { GradeDistributionChart, PassFailPieChart } from './components/AnalyticsCharts';

function App() {
  const [pdfData, setPdfData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDept, setSelectedDept] = useState(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Reset states
    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:5000/upload', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      if (!data.departmentData) {
        throw new Error('Invalid data received from server');
      }

      setPdfData(data);
      setError(null);
    } catch (error) {
      console.error('Error:', error);
      setError(error.message || 'Error uploading file');
      setPdfData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExcelDownload = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Starting Excel download...');
      
      // First verify server is running
      const testResponse = await fetch('http://localhost:5000/test');
      if (!testResponse.ok) {
        throw new Error('Server not responding');
      }

      // Prepare the data
      const excelData = {
        semester: pdfData.semester,
        examType: pdfData.examType,
        batch: pdfData.batch,
        departmentData: pdfData.departmentData
      };

      console.log('Sending data to server...');
      const response = await fetch('http://localhost:5000/generate-excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(excelData),
        mode: 'cors'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate Excel file');
      }

      console.log('Received response, processing download...');
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const fileName = `results_${pdfData.semester}_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log('Download completed successfully');

    } catch (error) {
      console.error('Excel generation error:', error);
      setError(`Failed to generate Excel file: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderDepartmentAnalysis = (dept, students) => {
    const regularStudents = students.filter(s => 
      s.registerNo.match(/(?:[A-Z]+)?([0-9]{2})[A-Z]{2}[0-9]{3}/)?.[1] === pdfData.batch.toString()
    );
    //const supplementaryStudents = students.filter(s => 
     // s.registerNo.match(/(?:[A-Z]+)?([0-9]{2})[A-Z]{2}[0-9]{3}/)?.[1] !== pdfData.batch.toString()
    //);

    const regularPassCount = regularStudents.filter(s => !s.FailedSubjects).length;
    const averageSGPA = regularStudents.reduce((sum, s) => sum + s.SGPA, 0) / regularStudents.length;
    const gradeDistribution = regularStudents.reduce((acc, s) => {
      const grade = Math.floor(s.SGPA);
      acc[grade] = (acc[grade] || 0) + 1;
      return acc;
    }, {});

    return (
      <div className="dept-analysis">
        <h2>{dept} Analysis</h2>
        
        <div className="analysis-grid">
          <div className="analysis-card">
            <h3>Overview</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <h4>Regular Students</h4>
                <div className="value">{regularStudents.length}</div>
              </div>
              <div className="stat-card">
                <h4>Pass Percentage</h4>
                <div className="value">
                  {((regularPassCount / regularStudents.length) * 100).toFixed(1)}%
                </div>
              </div>
              <div className="stat-card">
                <h4>Average SGPA</h4>
                <div className="value">{averageSGPA.toFixed(2)}</div>
              </div>
            </div>
          </div>

          <div className="analysis-card">
            <h3>Pass/Fail Distribution</h3>
            <PassFailPieChart 
              passCount={regularPassCount}
              failCount={regularStudents.length - regularPassCount}
            />
          </div>

          <div className="analysis-card">
            <h3>Grade Distribution</h3>
            <GradeDistributionChart data={gradeDistribution} />
          </div>

          <div className="analysis-card">
            <h3>Toppers (SGPA ≥ 9.0)</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Register No</th>
                    <th>SGPA</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students
                    .filter(s => s.SGPA >= 9.0)
                    .sort((a, b) => b.SGPA - a.SGPA)
                    .map(s => (
                      <tr key={s.registerNo}>
                        <td>{s.registerNo}</td>
                        <td>{s.SGPA}</td>
                        <td>{regularStudents.includes(s) ? 'Regular' : 'Supplementary'}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>

          <div className="analysis-card">
            <h3>Failed Students (Regular Batch)</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Register No</th>
                    <th>Failed Subjects</th>
                    <th>SGPA</th>
                  </tr>
                </thead>
                <tbody>
                  {regularStudents
                    .filter(s => s.FailedSubjects)
                    .map(s => (
                      <tr key={s.registerNo}>
                        <td>{s.registerNo}</td>
                        <td>{s.FailedSubjects}</td>
                        <td>{s.SGPA}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="app">
      {!pdfData ? (
        <div className="upload-container">
          <h1>Result Analysis System</h1>
          <div className="upload-box">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              id="file-upload"
              disabled={loading}
            />
            <label htmlFor="file-upload" className="upload-label">
              <FaFileUpload />
              <span>Choose PDF file</span>
            </label>
            {loading && <div className="loader">Processing...</div>}
            {error && <div className="error-message">{error}</div>}
          </div>
        </div>
      ) : (
        <div className="dashboard">
          <div className="dashboard-header">
            <h1>Results Analysis - {pdfData.semester}</h1>
            <div className="excel-container">
              <button 
                className={`excel-btn ${loading ? 'loading' : ''}`}
                onClick={handleExcelDownload}
                disabled={loading}
              >
                <FaFileExcel />
                {loading ? 'Generating Excel...' : 'Generate Excel'}
              </button>
              {error && (
                <div className="error-message">
                  {error}
                  <button onClick={() => setError(null)} className="close-error">×</button>
                </div>
              )}
            </div>
          </div>
          
          <div className="dashboard-content">
            <div className="departments-list">
              <h2>Departments</h2>
              {Object.entries(pdfData.departmentData).map(([dept, students]) => (
                <div
                  key={dept}
                  className={`dept-item ${selectedDept === dept ? 'selected' : ''}`}
                  onClick={() => setSelectedDept(dept)}
                >
                  <h3>{dept}</h3>
                  <p>{students.length} Students</p>
                </div>
              ))}
            </div>
            
            <div className="analysis-content">
              {selectedDept && pdfData.departmentData[selectedDept] && (
                renderDepartmentAnalysis(selectedDept, pdfData.departmentData[selectedDept])
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;