const express = require("express");
const multer = require("multer");
const pdf = require("pdf-parse");
const xlsx = require("xlsx");
const path = require("path");
const fs = require("fs");
const cors = require('cors');

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // Limit file size to 10MB
  }
});

// Add this at the very beginning, right after imports
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});

// Add CORS configuration before routes
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Move these to the top, before any routes
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Grade points mapping
const GRADE_POINTS = {
  'S': 10,    // Outstanding
  'A+': 9,
  'A': 8.5,
  'B+': 8,
  'B': 7.5,
  'C+': 7,
  'C': 6.5,
  'D': 6,
  'P': 5.5,   // Pass
  'F': 0,     // Fail
  'FE': 0,    // Fail due to eligibility
  'Absent': 0
};

// Department mapping
const DEPARTMENTS = {
  CS: "COMPUTER SCIENCE & ENGINEERING",
  CE: "CIVIL ENGINEERING",
  ME: "MECHANICAL ENGINEERING",
  EE: "ELECTRICAL AND ELECTRONICS ENGINEERING",
  EC: "ELECTRONICS & COMMUNICATION ENGG",
  CH: "CHEMICAL ENGINEERING",
  PE: "PRODUCTION ENGINEERING",
};

// Add non-credit courses list
const NON_CREDIT_COURSES = [
  'HUN101', 'HUT102', 'MCN201', 'MCN202', 'MCN301', 'MCN401'
];

// Keep only the originally defined subject credits
const SUBJECT_CREDITS = {
//s2 all batches
'MAT102': 4,
'CYT100': 4,
'EST110': 3,
'EST130': 4,
'EST102': 4,
'PHL120': 1,
'CYL120': 1,
'ESL120': 1,
'ESL130': 1,
'PHT100': 4,
'PHT110': 4,
'EST100': 3,
'EST120': 4,
    

//s3 cse
  'MAT203':4,
  'CST201':4,
  'CST203':4,
  'CST205':4,
  'EST200':2,
  'CSL201':2,
  'CSL203':2,
//s3 eee
  'MAT201':4,
  'EET201':4,
  'EET203':4,
  'EET205':4,
  'HUT200':2,
  'EEL201':2,
  'EEL203':2,
//s3 ece
 'MAT201':4,
 'ECT201':4,
 'ECT203':4,
 'ECT205':4,
 'EST200':2,
 'HUT200':2,
 'ECL201':2,
 'ECL203':2,
//s3 me
 'MAT201':4,
 'MET201':4,
 'MET203':4,
 'MET205':4,
 'EST200':2,
 'HUT200':2,
 'MEL201':2,
 'MEL203':2,
//s3 ce
 'MAT201':4,
 'CET201':4,
 'CET203':4,
 'CET205':4,
 'EST200':2,
 'HUT200':2,
 'CEL201':2,
 'CEL203':2,
//s3 che
'MAT201':4,
'CHT201':4,
'CHT203':4,
'CHT205':4,
'EST200':2,
'HUT200':2,
'CHL201':2,
'CHL203':2,

//s3 pe
'MAT201':4,
'PET201':4,
'PET203':4,
'PET205':4,
'EST200':2,
'HUT200':2,
'PEL201':2,
'PEL203':2,

//s4 cse
  'CST202': 4,
  'CST204': 4,
  'CST206': 4,
  'EST200': 2,
  'CSL202': 2,
  'CSL204': 2,
  'MAT206': 4,

//s4 eee
'MAT204': 4,
'EET202': 4,
'EET204': 4,
'EET206': 4,
'EST200': 2,
'HUT200':2,
'EEL202': 2,
'EEL204': 2,
 
//s4 ece
'MAT204': 4,
'ECT202': 4,
'ECT204': 4,
'ECT206': 4,
'EST200': 2,
'HUT200':2,
'ECL202': 2,
'ECL204': 2,

//s4 me
'MAT202': 4,  
'MET202': 4,
'MET204': 4,
'MET206': 4,
'EST200': 2,
'HUT200':2,
'MEL202': 2,
'MEL204': 2,

//s4 ce
'MAT202': 4,  
'CET202': 4,
'CET204': 4,
'CET206': 4,
'EST200': 2,
'HUT200':2,
'CEL202': 2,
'CEL204': 2,

//s4 che
'MAT202': 4,    
'CHT202': 4,
'CHT204': 4,
'CHT206': 4,
'EST200': 2,
'HUT200':2,
'CHL202': 2,
'CHL204': 2,

//s4 pe
'MAT202': 4,  
'EET212': 4,
'PET204': 4,
'PET206': 4,
'EST200': 2,  
'HUT200':2,
'EEL212': 2,
'PEL204': 2,


};

// Add this function after the SUBJECT_CREDITS definition
const getBatch = (semester, date) => {
  let year = date.slice(-2);
  if (semester === "S1") {
    return Number(year);
  } else if (semester === "S2" || semester === "S3") {
    return Number(year) - 1;
  } else if (semester === "S4" || semester === "S5") {
    return Number(year) - 2;
  } else if (semester === "S6" || semester === "S7") {
    return Number(year) - 3;
  } else {
    return Number(year) - 4;
  }
};

// Function to get department from register number
const getDepartmentFromRegNo = (regNo) => {
  const deptCode = regNo.match(/[A-Z]+\d{2}([A-Z]{2})\d{3}/)?.[1];
  return deptCode ? DEPARTMENTS[deptCode] || "OTHER" : "OTHER";
};

// Function to check if a student has failed
const hasFailed = (student) => {
  return Object.entries(student).some(([key, value]) => {
    return (
      key !== "registerNo" &&
      key !== "department" &&
      key !== "SGPA" &&
      key !== "FailedSubjects" &&
      (value === "F" || value === "FE" || value === "Absent")
    );
  });
};

// Function to calculate SGPA
const calculateSGPA = (student) => {
  let totalCreditPoints = 0;  // Σ(Grade points × Course credits)
  let totalCredits = 0;      // Σ(Course credits)

  Object.entries(student).forEach(([key, grade]) => {
    // Skip non-course properties and non-credit courses
    if (
      key === "registerNo" ||
      key === "SGPA" ||
      key === "department" ||
      key !== "FailedSubjects" &&
      key === "analysis" ||
      NON_CREDIT_COURSES.includes(key)
    ) {
      return;
    }

    // Get credit value for the course
    const courseCredits = SUBJECT_CREDITS[key];
    
    // Skip if credits are not defined for this course
    if (typeof courseCredits === 'undefined') {
      console.warn(`Warning: Credits not defined for course ${key}`);
      return;
    }
    
    // Get grade points for the grade
    const gradePoints = GRADE_POINTS[grade] || 0;
    
    // Calculate (Grade points × Course credits) for this course
    const creditPoints = gradePoints * courseCredits;
    
    // Add to totals
    totalCreditPoints += creditPoints;
    totalCredits += courseCredits;

    // Debug logging
    console.log(`Course: ${key}, Credits: ${courseCredits}, Grade: ${grade}, Grade Points: ${gradePoints}, Credit Points: ${creditPoints}`);
  });

  // Calculate SGPA = Σ(Grade points × Course credits) / Σ(Course credits)
  // Round to 2 decimal places
  student.SGPA = totalCredits > 0 
    ? Number((totalCreditPoints / totalCredits).toFixed(2)) 
    : 0;

  // Debug logging
  console.log(`Student ${student.registerNo}: Total Credit Points = ${totalCreditPoints}, Total Credits = ${totalCredits}, SGPA = ${student.SGPA}`);
};

// Function to get failed subjects
const getFailedSubjects = (student) => {
  return Object.entries(student)
    .filter(([key, value]) => {
      return (
        key !== "registerNo" &&
        key !== "department" &&
        key !== "SGPA" &&
        key !== "FailedSubjects" &&
        (value === "F" || value === "FE" || value === "Absent")
      );
    })
    .map(([key]) => {
      // Mark non-credit courses with an asterisk in failed subjects list
      return NON_CREDIT_COURSES.includes(key) ? `${key}*` : key;
    })
    .join(", ");
};

// Modify the isRegularBatch function to handle any batch pattern
const isRegularBatch = (regNo, batch) => {
  // Match any college code followed by batch year and department code
  // Examples: TCR22CS061, LTCR22CS072, TKM22CS123, etc.
  const match = regNo.match(/(?:[A-Z]+)?([0-9]{2})[A-Z]{2}[0-9]{3}/);
  if (!match) return false;
  
  const studentBatch = Number(match[1]);
  return studentBatch === batch;
};

// Modify the extractSemester function to better handle date extraction
const extractSemester = (pdfText) => {
  let semester = 'Unknown';
  let examType = 'Unknown';
  let examDate = '';

  // Extract semester
  const semesterPatterns = [
    /B.Tech S(\d)\s+.*?(Regular|Supplementary)/i,
    /Semester (\d)/i,
    /S(\d) /i
  ];

  for (const pattern of semesterPatterns) {
    const match = pdfText.match(pattern);
    if (match) {
      semester = `S${match[1]}`;
      break;
    }
  }

  // Extract exam type
  const examTypeMatch = pdfText.match(/(Regular|Supplementary)/i);
  if (examTypeMatch) {
    examType = examTypeMatch[1];
  }

  // Improved date extraction - try multiple date formats
  const datePatterns = [
    /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* ?\d{4}/i,  // Month Year
    /\d{2}[-/]\d{4}/,  // MM/YYYY or MM-YYYY
    /\d{4}/  // Just the year
  ];

  for (const pattern of datePatterns) {
    const match = pdfText.match(pattern);
    if (match) {
      examDate = match[0];
      break;
    }
  }

  return {
    semester,
    examType,
    examDate
  };
};

// Modify parsePDF function to include batch information
const parsePDF = async (pdfBuffer) => {
  const data = await pdf(pdfBuffer);
  const lines = data.text.split("\n");
  const departmentData = {};
  let currentStudent = null;
  let processingStudent = false;
  
  // Extract semester information with exam type and date
  const { semester, examType, examDate } = extractSemester(data.text);
  
  // Calculate batch if we have semester and date
  const batch = examDate ? getBatch(semester, examDate) : null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;

    const registerMatch = line.match(/([A-Z]+\d{2}[A-Z]{2}\d{3})/);

    if (registerMatch) {
      // Save previous student data if exists
      if (currentStudent) {
        calculateSGPA(currentStudent);
        currentStudent.FailedSubjects = getFailedSubjects(currentStudent);
        const dept = currentStudent.department;
        if (!departmentData[dept]) departmentData[dept] = [];
        departmentData[dept].push(currentStudent);
      }

      // Start new student
      const regNo = registerMatch[1];
      currentStudent = {
        registerNo: regNo,
        department: getDepartmentFromRegNo(regNo),
      };
      processingStudent = true;

      // Process grades on the same line as register number
      const gradeMatches = line.match(/([A-Z]+\d{3})\(([A-Z+]+|Absent)\)/g);
      if (gradeMatches) {
        gradeMatches.forEach((match) => {
          const [_, code, grade] = match.match(/([A-Z]+\d{3})\(([A-Z+]+|Absent)\)/);
          currentStudent[code] = grade;
        });
      }
    } else if (processingStudent && currentStudent) {
      // Check for grades on subsequent lines
      const gradeMatches = line.match(/([A-Z]+\d{3})\(([A-Z+]+|Absent)\)/g);
      if (gradeMatches) {
        gradeMatches.forEach((match) => {
          const [_, code, grade] = match.match(/([A-Z]+\d{3})\(([A-Z+]+|Absent)\)/);
          currentStudent[code] = grade;
        });
      } else {
        // If no grades found on this line, assume we're done with this student
        processingStudent = false;
      }
    }
  }

  // Don't forget to save the last student
  if (currentStudent) {
    calculateSGPA(currentStudent);
    currentStudent.FailedSubjects = getFailedSubjects(currentStudent);
    const dept = currentStudent.department;
    if (!departmentData[dept]) departmentData[dept] = [];
    departmentData[dept].push(currentStudent);
  }

  // Add debug logging
  console.log("Parsed Department Data:", JSON.stringify(departmentData, null, 2));

  // Return both semester and department data
  return {
    semester,
    examType,
    batch,
    departmentData
  };
};

// Modify generateDepartmentAnalysis to handle regular/supplementary separation
const generateDepartmentAnalysis = (students, batch) => {
  // Separate regular and supplementary students
  const regularStudents = students.filter(student => isRegularBatch(student.registerNo, batch));
  const supplementaryStudents = students.filter(student => !isRegularBatch(student.registerNo, batch));

  const analysis = {
    totalStudents: students.length,
    regularStudents: regularStudents.length,
    supplementaryStudents: supplementaryStudents.length,
    regular: {
      passCount: 0,
      failCount: 0,
      averageSGPA: 0,
      passPercentage: 0,
    },
    overall: {
    passCount: 0,
    failCount: 0,
    averageSGPA: 0,
    topperSGPA: 0,
    topperRegNo: '',
    },
    gradeDistribution: {
      'S': 0, 'A+': 0, 'A': 0, 'B+': 0, 'B': 0,
      'C+': 0, 'C': 0, 'D': 0, 'P': 0, 'F': 0,
      'FE': 0, 'Absent': 0
    },
    subjectWiseAnalysis: {}
  };

  // Process regular students
  let regularTotalSGPA = 0;
  regularStudents.forEach(student => {
    regularTotalSGPA += student.SGPA;
    if (hasFailed(student)) {
      analysis.regular.failCount++;
    } else {
      analysis.regular.passCount++;
    }
  });

  // Calculate regular batch statistics
  if (regularStudents.length > 0) {
    analysis.regular.averageSGPA = Number((regularTotalSGPA / regularStudents.length).toFixed(2));
    analysis.regular.passPercentage = Number(((analysis.regular.passCount / regularStudents.length) * 100).toFixed(2));
  }

  // Process all students for overall analysis
  let totalSGPA = 0;
  students.forEach(student => {
    totalSGPA += student.SGPA;
    
    if (hasFailed(student)) {
      analysis.overall.failCount++;
    } else {
      analysis.overall.passCount++;
    }

    // Track topper
    if (student.SGPA > analysis.overall.topperSGPA) {
      analysis.overall.topperSGPA = student.SGPA;
      analysis.overall.topperRegNo = student.registerNo;
    }

    // Rest of the grade distribution and subject analysis remains the same
    Object.entries(student).forEach(([key, grade]) => {
      if (
        key !== "registerNo" &&
        key !== "SGPA" &&
        key !== "department" &&
        key !== "FailedSubjects" &&
        key !== "analysis"
      ) {
        if (!analysis.subjectWiseAnalysis[key]) {
          analysis.subjectWiseAnalysis[key] = {
            passCount: 0,
            failCount: 0,
            gradeDistribution: { ...analysis.gradeDistribution }
          };
        }

        analysis.subjectWiseAnalysis[key].gradeDistribution[grade]++;
        if (grade === 'F' || grade === 'FE' || grade === 'Absent') {
          analysis.subjectWiseAnalysis[key].failCount++;
        } else {
          analysis.subjectWiseAnalysis[key].passCount++;
        }

        analysis.gradeDistribution[grade]++;
      }
    });
  });

  analysis.overall.averageSGPA = Number((totalSGPA / students.length).toFixed(2));

  return analysis;
};

// Function to generate Excel file
const generateExcel = (data) => {
  const workbook = xlsx.utils.book_new();
  const { semester, examType, batch, departmentData } = data;

  Object.entries(departmentData).forEach(([dept, students]) => {
    try {
      // Create a safe sheet name
      const sheetName = dept.substring(0, 31).replace(/[\[\]\*\/\\\?]/g, '');

      // Filter regular and supplementary students
      const regularStudents = students.filter(student => {
        const match = student.registerNo.match(/(?:[A-Z]+)?(\d{2})[A-Z]{2}\d{3}/);
        return match && match[1] === batch.toString();
      });

      const supplementaryStudents = students.filter(student => {
        const match = student.registerNo.match(/(?:[A-Z]+)?(\d{2})[A-Z]{2}\d{3}/);
        return !match || match[1] !== batch.toString();
      });

    // Get all subject codes
    const subjectCodes = new Set();
      students.forEach(student => {
        Object.keys(student).forEach(key => {
          if (!['registerNo', 'SGPA', 'department', 'FailedSubjects'].includes(key)) {
          subjectCodes.add(key);
        }
      });
    });
      const sortedSubjectCodes = Array.from(subjectCodes).sort();

      // Create worksheet data
      const wsData = [
        [`${dept} - ${semester} ${examType} Examination`],
        [`Regular Batch: 20${batch}`],
        [],
        // Regular Students Section
        ['Regular Students'],
        ['Register No', ...sortedSubjectCodes, 'SGPA', 'Failed Subjects']
      ];

      // Add regular student data
      regularStudents.forEach(student => {
      const row = [student.registerNo];
        sortedSubjectCodes.forEach(code => {
          row.push(student[code] || '-');
        });
        row.push(
          typeof student.SGPA === 'number' ? student.SGPA.toFixed(2) : '-',
          student.FailedSubjects || '-'
        );
        wsData.push(row);
      });

      // Add Regular Batch Analysis
      const passCount = regularStudents.filter(s => !s.FailedSubjects).length;
      const avgSGPA = regularStudents.reduce((acc, s) => acc + (s.SGPA || 0), 0) / regularStudents.length;

      wsData.push(
        [],
        ['Regular Batch Analysis'],
        ['Total Regular Students', regularStudents.length],
        ['Pass Count', passCount],
        ['Fail Count', regularStudents.length - passCount],
        ['Pass Percentage', `${((passCount / regularStudents.length) * 100).toFixed(2)}%`],
        ['Average SGPA', avgSGPA.toFixed(2)],
        []
      );

      // Add Regular Batch Toppers (SGPA >= 9.0)
      wsData.push(
        ['Regular Batch Toppers (SGPA ≥ 9.0)'],
        ['Register No', 'SGPA', 'Failed Subjects']
      );
      regularStudents
        .filter(s => s.SGPA >= 9.0)
        .sort((a, b) => b.SGPA - a.SGPA)
        .forEach(student => {
          wsData.push([
            student.registerNo,
            student.SGPA.toFixed(2),
            student.FailedSubjects || '-'
          ]);
        });

      // Add Subject-wise Analysis
      wsData.push(
        [],
        ['Subject-wise Analysis'],
        ['Subject Code', 'Total Students', 'Pass Count', 'Fail Count', 'Pass Percentage']
      );

      sortedSubjectCodes.forEach(code => {
        const studentsWithSubject = regularStudents.filter(s => s[code]);
        const subjectPassCount = studentsWithSubject.filter(s => 
          !['F', 'FE', 'Absent'].includes(s[code])
        ).length;
        const subjectFailCount = studentsWithSubject.length - subjectPassCount;
        const passPercentage = (subjectPassCount / studentsWithSubject.length) * 100;

        wsData.push([
          code,
          studentsWithSubject.length,
          subjectPassCount,
          subjectFailCount,
          `${passPercentage.toFixed(2)}%`
        ]);
      });

      // Add Supplementary Students Section
      wsData.push(
        [],
        ['Supplementary Students'],
        ['Register No', ...sortedSubjectCodes, 'SGPA', 'Failed Subjects']
      );

      supplementaryStudents.forEach(student => {
        const row = [student.registerNo];
        sortedSubjectCodes.forEach(code => {
          row.push(student[code] || '-');
        });
        row.push(
          typeof student.SGPA === 'number' ? student.SGPA.toFixed(2) : '-',
          student.FailedSubjects || '-'
        );
        wsData.push(row);
      });

      // Add Grade Distribution
      wsData.push(
        [],
        ['Grade Distribution (Regular Batch)'],
        ['Grade', 'Count', 'Percentage']
      );

      const grades = ['S', 'A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'P', 'F', 'FE', 'Absent'];
      const gradeCount = {};
      let totalGrades = 0;

      regularStudents.forEach(student => {
        sortedSubjectCodes.forEach(code => {
          if (student[code]) {
            gradeCount[student[code]] = (gradeCount[student[code]] || 0) + 1;
            totalGrades++;
          }
        });
      });

      grades.forEach(grade => {
        if (gradeCount[grade]) {
          wsData.push([
            grade,
            gradeCount[grade],
            `${((gradeCount[grade] / totalGrades) * 100).toFixed(2)}%`
          ]);
        }
      });

      // Create worksheet with formatting
      const ws = xlsx.utils.aoa_to_sheet(wsData);

      // Set column widths
      ws['!cols'] = [
        { width: 15 }, // Register No
        ...sortedSubjectCodes.map(() => ({ width: 10 })), // Subject codes
        { width: 10 }, // SGPA
        { width: 30 }  // Failed Subjects
      ];

      // Add some basic styling
      for (let i = 0; i < wsData.length; i++) {
        if (wsData[i][0] && typeof wsData[i][0] === 'string' && 
            (wsData[i][0].includes('Analysis') || 
             wsData[i][0].includes('Students') || 
             wsData[i][0].includes('Toppers') || 
             wsData[i][0].includes('Distribution'))) {
          // Make headers bold by using a different cell format
          const range = xlsx.utils.encode_range({
            s: { c: 0, r: i },
            e: { c: wsData[i].length - 1, r: i }
          });
          ws['!merges'] = ws['!merges'] || [];
          ws['!merges'].push(xlsx.utils.decode_range(range));
        }
      }

      // Add the worksheet to workbook
    xlsx.utils.book_append_sheet(workbook, ws, sheetName);

    } catch (error) {
      console.error(`Error processing department ${dept}:`, error);
    }
  });

  if (workbook.SheetNames.length === 0) {
    throw new Error('No valid sheets could be generated');
  }

  return workbook;
};

// Add a test endpoint to verify server is running
app.get('/test', (req, res) => {
  res.json({ message: 'Server is running' });
});

// API endpoint to upload and process PDF
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }
    
    if (!req.file.mimetype || !req.file.mimetype.includes('pdf')) {
      return res.status(400).json({ error: "Uploaded file must be a PDF." });
    }

    const pdfBuffer = req.file.buffer;
    
    try {
      const parsedData = await parsePDF(pdfBuffer);
      
      // Validate parsed data
      if (!parsedData.departmentData || Object.keys(parsedData.departmentData).length === 0) {
        throw new Error("No valid data could be extracted from the PDF");
      }

      // Send the parsed data as JSON
      res.json(parsedData);

    } catch (error) {
      console.error("PDF parsing error:", error);
      res.status(400).json({ error: `Unable to parse PDF file: ${error.message}` });
    }

  } catch (error) {
    console.error("Error processing PDF:", error);
    res.status(500).json({ error: `Error processing PDF: ${error.message}` });
  }
});

// Modify the Excel generation endpoint
app.post("/generate-excel", async (req, res) => {
  try {
    console.log("Received request for Excel generation");
    const data = req.body;
    
    if (!data || !data.departmentData) {
      console.error("Invalid data received:", data);
      return res.status(400).json({ error: "Invalid data provided" });
    }

    console.log("Generating Excel for semester:", data.semester);
    const workbook = generateExcel(data);

    // Write to buffer
    const buffer = xlsx.write(workbook, { 
      type: 'buffer',
      bookType: 'xlsx',
      bookSST: false
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=results_${data.semester}.xlsx`);
    res.setHeader('Content-Length', buffer.length);

    // Send the buffer
    res.status(200).send(buffer);

  } catch (error) {
    console.error("Error generating Excel:", error);
    res.status(500).json({ error: "Failed to generate Excel file" });
  }
});

// Add this after your routes
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something broke!',
    message: err.message
  });
});

// Update the server start to include error handling
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', (error) => {
  if (error) {
    console.error('Error starting server:', error);
    return;
  }
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop');
});