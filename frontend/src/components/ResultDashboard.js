import React, { useState } from 'react';
import { FaFileExcel, FaChartBar } from 'react-icons/fa';

const ResultDashboard = ({ pdfData }) => {
  const [selectedDept, setSelectedDept] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const handleExcelGenerate = async () => {
    try {
      const response = await fetch('/api/generate-excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pdfData)
      });
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `results_${pdfData.semester}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating Excel:', error);
    }
  };

  const renderDepartmentList = () => (
    <div className="department-list">
      <h2>Departments</h2>
      <div className="dept-grid">
        {Object.entries(pdfData.departmentData).map(([dept, students]) => (
          <div 
            key={dept} 
            className={`dept-card ${selectedDept === dept ? 'selected' : ''}`}
            onClick={() => setSelectedDept(dept)}
          >
            <h3>{dept}</h3>
            <p>{students.length} Students</p>
            <p>Regular Batch: 20{pdfData.batch}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAnalysisContent = () => {
    if (!selectedDept) return null;

    const students = pdfData.departmentData[selectedDept];
    const regularStudents = students.filter(s => 
      s.registerNo.match(/(?:[A-Z]+)?([0-9]{2})[A-Z]{2}[0-9]{3}/)?.[1] === pdfData.batch.toString()
    );
    const supplementaryStudents = students.filter(s => 
      s.registerNo.match(/(?:[A-Z]+)?([0-9]{2})[A-Z]{2}[0-9]{3}/)?.[1] !== pdfData.batch.toString()
    );

    const tabs = {
      overview: {
        label: 'Overview',
        content: (
          <div className="analysis-overview">
            <div className="stats-cards">
              <div className="stat-card">
                <h4>Regular Students</h4>
                <p>{regularStudents.length}</p>
              </div>
              <div className="stat-card">
                <h4>Supplementary Students</h4>
                <p>{supplementaryStudents.length}</p>
              </div>
              <div className="stat-card">
                <h4>Regular Pass %</h4>
                <p>
                  {((regularStudents.filter(s => !s.FailedSubjects).length / regularStudents.length) * 100).toFixed(2)}%
                </p>
              </div>
              <div className="stat-card">
                <h4>Average SGPA (Regular)</h4>
                <p>
                  {(regularStudents.reduce((acc, s) => acc + s.SGPA, 0) / regularStudents.length).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )
      },
      toppers: {
        label: 'Toppers',
        content: (
          <div className="toppers-list">
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
                  .map(student => (
                    <tr key={student.registerNo}>
                      <td>{student.registerNo}</td>
                      <td>{student.SGPA}</td>
                      <td>{regularStudents.includes(student) ? 'Regular' : 'Supplementary'}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        )
      },
      failures: {
        label: 'Failed Subjects',
        content: (
          <div className="failures-analysis">
            {regularStudents
              .filter(s => s.FailedSubjects)
              .map(student => (
                <div key={student.registerNo} className="failure-card">
                  <h4>{student.registerNo}</h4>
                  <p>Failed Subjects: {student.FailedSubjects}</p>
                  <p>SGPA: {student.SGPA}</p>
                </div>
              ))
            }
          </div>
        )
      },
      supplementary: {
        label: 'Supplementary',
        content: (
          <div className="supplementary-list">
            <table>
              <thead>
                <tr>
                  <th>Register No</th>
                  <th>SGPA</th>
                  <th>Failed Subjects</th>
                </tr>
              </thead>
              <tbody>
                {supplementaryStudents.map(student => (
                  <tr key={student.registerNo}>
                    <td>{student.registerNo}</td>
                    <td>{student.SGPA}</td>
                    <td>{student.FailedSubjects || 'None'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
    };

    return (
      <div className="analysis-container">
        <div className="analysis-header">
          <h2>{selectedDept} Analysis</h2>
          <div className="tab-buttons">
            {Object.entries(tabs).map(([key, { label }]) => (
              <button
                key={key}
                className={`tab-button ${activeTab === key ? 'active' : ''}`}
                onClick={() => setActiveTab(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="tab-content">
          {tabs[activeTab].content}
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Result Analysis - {pdfData.semester}</h1>
        <button className="excel-button" onClick={handleExcelGenerate}>
          <FaFileExcel /> Generate Excel
        </button>
      </div>
      <div className="dashboard-content">
        {renderDepartmentList()}
        {renderAnalysisContent()}
      </div>
    </div>
  );
};

export default ResultDashboard; 