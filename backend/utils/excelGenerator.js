const ExcelJS = require('exceljs');

async function generateExcel(departmentData) {
  const workbook = new ExcelJS.Workbook();
  
  // Set workbook properties
  workbook.creator = 'Result Analysis System';
  workbook.created = new Date();

  // Define reusable styles
  const headerStyle = {
    font: { bold: true, size: 12, color: { argb: 'FFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '2F75B5' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      top: { style: 'thin', color: { argb: '000000' } },
      left: { style: 'thin', color: { argb: '000000' } },
      bottom: { style: 'thin', color: { argb: '000000' } },
      right: { style: 'thin', color: { argb: '000000' } }
    }
  };

  const subHeaderStyle = {
    font: { bold: true, size: 11, color: { argb: 'FFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: { top: 'thin', left: 'thin', bottom: 'thin', right: 'thin' }
  };

  const dataStyle = {
    font: { size: 10, color: { argb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: { top: 'thin', left: 'thin', bottom: 'thin', right: 'thin' }
  };

  const highlightStyle = {
    font: { bold: true, size: 10 },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2EFDA' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: { top: 'thin', left: 'thin', bottom: 'thin', right: 'thin' }
  };

  Object.entries(departmentData).forEach(([dept, data]) => {
    const worksheet = workbook.addWorksheet(dept, {
      properties: { tabColor: { argb: '2F75B5' } }
    });

    // Set column widths
    worksheet.columns = [
      { width: 20, style: { alignment: { horizontal: 'center' } } }, // Register Number
      { width: 35, style: { alignment: { horizontal: 'center' } } }, // Name
      { width: 15, style: { alignment: { horizontal: 'center' } } }, // SGPA
      { width: 15, style: { alignment: { horizontal: 'center' } } }, // Status
      { width: 40, style: { alignment: { horizontal: 'center' } } }  // Failed Subjects
    ];

    let currentRow = 1;

    // Department Title
    worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
    const titleCell = worksheet.getCell(`A${currentRow}`);
    titleCell.value = `Department of ${dept} - Result Analysis`;
    titleCell.font = { size: 16, bold: true, color: { argb: '000000' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(currentRow).height = 30;
    currentRow += 2;

    // Regular Students Section
    worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
    const regularHeader = worksheet.getCell(`A${currentRow}`);
    regularHeader.value = 'REGULAR BATCH STUDENTS';
    regularHeader.font = { size: 14, bold: true, color: { argb: 'FFFFFF' } };
    regularHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2F75B5' } };
    regularHeader.alignment = { horizontal: 'center', vertical: 'middle' };
    currentRow++;

    // Headers
    const headers = ['Register Number', 'Student Name', 'SGPA', 'Status', 'Failed Subjects'];
    const headerRow = worksheet.getRow(currentRow);
    headers.forEach((header, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    currentRow++;

    // Regular students data
    const regularStudents = data.students.filter(s => isRegularBatch(s.registerNo));
    regularStudents.forEach((student, index) => {
      const row = worksheet.getRow(currentRow);
      row.values = [
        student.registerNo,
        student.name,
        student.sgpa,
        student.sgpa >= 5 ? 'PASS' : 'FAIL',
        student.failedSubjects.join(', ')
      ];

      // Alternate row colors
      const fillColor = index % 2 === 0 ? 'F2F2F2' : 'FFFFFF';
      
      row.eachCell((cell) => {
        cell.font = { size: 11 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        
        // Highlight SGPA cell based on value
        if (cell.col === 3) {
        if (student.sgpa >= 9) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '92D050' } }; // Green
          } else if (student.sgpa < 5) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9999' } }; // Red
          }
        }

        // Style pass/fail status
        if (cell.col === 4) {
          cell.font = { 
            bold: true, 
            color: { argb: student.sgpa >= 5 ? '008000' : 'FF0000' }
          };
        }
      });
      currentRow++;
    });
    currentRow += 2;

    // Toppers Section
    worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
    const toppersHeader = worksheet.getCell(`A${currentRow}`);
    toppersHeader.value = 'DEPARTMENT TOPPERS (SGPA ≥ 9)';
    toppersHeader.font = { size: 14, bold: true, color: { argb: 'FFFFFF' } };
    toppersHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2F75B5' } };
    toppersHeader.alignment = { horizontal: 'center', vertical: 'middle' };
    currentRow++;

    // Add toppers data with special formatting
    const toppers = regularStudents
      .filter(s => s.sgpa >= 9)
      .sort((a, b) => b.sgpa - a.sgpa);

    toppers.forEach((topper, index) => {
      const row = worksheet.getRow(currentRow + index);
      row.values = [topper.registerNo, topper.name, topper.sgpa, 'PASS', ''];
      row.eachCell((cell) => {
        cell.font = { size: 11, bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2EFDA' } };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });
    currentRow += toppers.length + 2;

    // Subject Analysis Section
    worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
    const subjectHeader = worksheet.getCell(`A${currentRow}`);
    subjectHeader.value = 'SUBJECT-WISE ANALYSIS';
    subjectHeader.font = { size: 14, bold: true, color: { argb: 'FFFFFF' } };
    subjectHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2F75B5' } };
    subjectHeader.alignment = { horizontal: 'center', vertical: 'middle' };
    currentRow++;

    // Subject analysis headers
    const subjectHeaders = ['Subject Code', 'Total Students', 'Passed', 'Failed', 'Pass %'];
    const subjectHeaderRow = worksheet.getRow(currentRow);
    subjectHeaders.forEach((header, i) => {
      const cell = subjectHeaderRow.getCell(i + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    currentRow++;

    // Add subject analysis data
    Object.entries(data.subjectAnalysis).forEach(([subject, analysis], index) => {
      const row = worksheet.getRow(currentRow + index);
      const passPercentage = ((analysis.pass / analysis.total) * 100).toFixed(2);
      row.values = [
        subject,
        analysis.total,
        analysis.pass,
        analysis.fail,
        `${passPercentage}%`
      ];

      const fillColor = index % 2 === 0 ? 'F2F2F2' : 'FFFFFF';
      row.eachCell((cell) => {
        cell.font = { size: 11 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        
        // Color code pass percentage
        if (cell.col === 5) {
          if (parseFloat(passPercentage) >= 80) {
            cell.font = { size: 11, bold: true, color: { argb: '008000' } };
          } else if (parseFloat(passPercentage) < 50) {
            cell.font = { size: 11, bold: true, color: { argb: 'FF0000' } };
          }
        }
      });
    });

    // Apply protection and filters
    worksheet.protect('your-password-here', {
      selectLockedCells: true,
      selectUnlockedCells: true,
      formatCells: false,
      formatColumns: false,
      formatRows: false,
      insertColumns: false,
      insertRows: false,
      insertHyperlinks: false,
      deleteColumns: false,
      deleteRows: false,
      sort: true,
      autoFilter: true
    });

    // Add autofilter
    worksheet.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: currentRow - 1, column: 5 }
    };
  });

  return workbook;
} 

// Helper function to check if a student is from regular batch
function isRegularBatch(registerNo) {
  // Implement your logic here
  return true; // Replace with actual logic
}

module.exports = { generateExcel }; 