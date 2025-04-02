import React, { useState } from 'react';

const DepartmentAnalysis = ({ departmentData, batch }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const regularStudents = departmentData.filter(student => 
    student.registerNo.includes(batch.toString())
  );
  const supplementaryStudents = departmentData.filter(student => 
    !student.registerNo.includes(batch.toString())
  );

  const tabs = {
    overview: 'Overview',
    toppers: 'Toppers',
    failures: 'Subject-wise Failures',
    supplementary: 'Supplementary Students'
  };

  const renderOverview = () => (
    <div className="analysis-section">
      <h3>Department Overview</h3>
      <div className="stats-grid">
        <div className="stat-card">
          <h4>Regular Students</h4>
          <p>{regularStudents.length}</p>
        </div>
        <div className="stat-card">
          <h4>Pass Percentage</h4>
          <p>{calculatePassPercentage(regularStudents)}%</p>
        </div>
        <div className="stat-card">
          <h4>Average SGPA</h4>
          <p>{calculateAverageSGPA(regularStudents)}</p>
        </div>
      </div>
    </div>
  );

  const renderToppers = () => (
    <div className="analysis-section">
      <h3>Department Toppers</h3>
      <table className="analysis-table">
        <thead>
          <tr>
            <th>Register No</th>
            <th>SGPA</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {departmentData
            .filter(student => student.SGPA >= 9.0)
            .sort((a, b) => b.SGPA - a.SGPA)
            .map(student => (
              <tr key={student.registerNo}>
                <td>{student.registerNo}</td>
                <td>{student.SGPA}</td>
                <td>{student.registerNo.includes(batch.toString()) ? 'Regular' : 'Supplementary'}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );

  const renderFailures = () => (
    <div className="analysis-section">
      <h3>Subject-wise Failures</h3>
      {Object.entries(getSubjectWiseFailures(regularStudents)).map(([subject, failures]) => (
        <div key={subject} className="subject-failures">
          <h4>{subject}</h4>
          <p>Failed Students: {failures.length}</p>
          <div className="failed-students">
            {failures.map(student => (
              <div key={student.registerNo} className="student-card">
                <p>{student.registerNo}</p>
                <p>Grade: {student[subject]}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderSupplementary = () => (
    <div className="analysis-section">
      <h3>Supplementary Students</h3>
      <table className="analysis-table">
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
              <td>{student.FailedSubjects}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="department-analysis">
      <div className="tab-navigation">
        {Object.entries(tabs).map(([key, label]) => (
          <button
            key={key}
            className={`tab-button ${activeTab === key ? 'active' : ''}`}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'toppers' && renderToppers()}
        {activeTab === 'failures' && renderFailures()}
        {activeTab === 'supplementary' && renderSupplementary()}
      </div>
    </div>
  );
};

export default DepartmentAnalysis; 