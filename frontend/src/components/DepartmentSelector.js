import React from 'react';

const DepartmentSelector = ({ departments, onSelectDepartment }) => {
  return (
    <div className="department-selector">
      <h2>Select Department</h2>
      <div className="department-grid">
        {Object.entries(departments).map(([code, name]) => (
          <button
            key={code}
            className="department-button"
            onClick={() => onSelectDepartment(code, name)}
          >
            <h3>{code}</h3>
            <p>{name}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DepartmentSelector; 