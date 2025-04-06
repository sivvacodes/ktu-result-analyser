//node server.js
//npm start
const express = require("express");
const multer = require("multer");
const pdf = require("pdf-parse");
const xlsx = require("xlsx");
const path = require("path");
const fs = require("fs");

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

// Move these to the top, before any routes
app.use(express.json());
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
  'I': 0,     // Incomplete
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

// Add subject credits mapping
const SUBJECT_CREDITS = {
  'CST202': 4,
  'CST204': 4,
  'CST206': 4,
  'EST200': 2,
  'CSL202': 2,
  'CSL206': 2,
  'MAT206': 4,
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
  let totalGradePoints = 0;  // Σ(Ci × GPi)
  let totalCredits = 0;      // ΣCi

  Object.entries(student).forEach(([key, grade]) => {
    // Skip non-course properties and non-credit courses
    if (
      key === "registerNo" ||
      key === "SGPA" ||
      key === "department" ||
      key === "FailedSubjects" ||
      key === "analysis" ||
      NON_CREDIT_COURSES.includes(key)
    ) {
      return;
    }

    // Get credit value for the course
    const credits = SUBJECT_CREDITS[key] || 3;  // Default to 3 if not specified
    
    // Get grade points for the grade
    const gradePoints = GRADE_POINTS[grade] || 0;
    
    // Calculate Ci × GPi for this course
    const courseGradePoints = credits * gradePoints;
    
    // Add to totals
    totalGradePoints += courseGradePoints;
    totalCredits += credits;

    // Debug logging
    console.log(`Course: ${key}, Credits: ${credits}, Grade: ${grade}, Points: ${gradePoints}, Course GP: ${courseGradePoints}`);
  });

  // Calculate SGPA = Σ(Ci × GPi) / ΣCi
  // Round to 2 decimal places as per KTU norms
  student.SGPA = totalCredits > 0 
    ? Number((totalGradePoints / totalCredits).toFixed(2)) 
    : 0;

  // Debug logging
  console.log(`Student ${student.registerNo}: Total Grade Points = ${totalGradePoints}, Total Credits = ${totalCredits}, SGPA = ${student.SGPA}`);
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

// Function to parse PDF data
const parsePDF = async (pdfBuffer) => {
  const data = await pdf(pdfBuffer);
  const lines = data.text.split("\n");
  const departmentData = {};
  let currentStudent = null;
  let processingStudent = false;

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

  return departmentData;
};

// New function to generate department analysis
const generateDepartmentAnalysis = (students) => {
  const analysis = {
    totalStudents: students.length,
    passCount: 0,
    failCount: 0,
    averageSGPA: 0,
    topperSGPA: 0,
    topperRegNo: '',
    gradeDistribution: {
      'S': 0, 'A+': 0, 'A': 0, 'B+': 0, 'B': 0,
      'C+': 0, 'C': 0, 'D': 0, 'P': 0, 'F': 0,
      'FE': 0, 'Absent': 0
    },
    subjectWiseAnalysis: {}
  };

  // Calculate pass/fail count and average SGPA
  let totalSGPA = 0;
  students.forEach(student => {
    totalSGPA += student.SGPA;
    
    if (hasFailed(student)) {
      analysis.failCount++;
    } else {
      analysis.passCount++;
    }

    // Track topper
    if (student.SGPA > analysis.topperSGPA) {
      analysis.topperSGPA = student.SGPA;
      analysis.topperRegNo = student.registerNo;
    }

    // Count grades for each subject
    Object.entries(student).forEach(([key, grade]) => {
      if (
        key !== "registerNo" &&
        key !== "SGPA" &&
        key !== "department" &&
        key !== "FailedSubjects" &&
        key !== "analysis"
      ) {
        // Initialize subject analysis if not exists
        if (!analysis.subjectWiseAnalysis[key]) {
          analysis.subjectWiseAnalysis[key] = {
            passCount: 0,
            failCount: 0,
            gradeDistribution: { ...analysis.gradeDistribution }
          };
        }

        // Update subject-wise analysis
        analysis.subjectWiseAnalysis[key].gradeDistribution[grade]++;
        if (grade === 'F' || grade === 'FE' || grade === 'Absent') {
          analysis.subjectWiseAnalysis[key].failCount++;
        } else {
          analysis.subjectWiseAnalysis[key].passCount++;
        }

        // Update overall grade distribution
        analysis.gradeDistribution[grade]++;
      }
    });
  });

  analysis.averageSGPA = Number((totalSGPA / students.length).toFixed(2));
  analysis.passPercentage = Number(((analysis.passCount / analysis.totalStudents) * 100).toFixed(2));

  return analysis;
};

// Function to generate Excel file
const generateExcel = (departmentData) => {
  const workbook = xlsx.utils.book_new();

  // Helper function to create safe sheet names
  const createSafeSheetName = (deptName, isAnalysis = false) => {
    // Map of department names to shorter codes
    const deptCodes = {
      'COMPUTER SCIENCE & ENGINEERING': 'CSE',
      'CIVIL ENGINEERING': 'CE',
      'MECHANICAL ENGINEERING': 'ME',
      'ELECTRICAL AND ELECTRONICS ENGINEERING': 'EEE',
      'ELECTRONICS & COMMUNICATION ENGG': 'ECE',
      'CHEMICAL ENGINEERING': 'CHE',
      'PRODUCTION ENGINEERING': 'PE',
      'OTHER': 'OTH'
    };

    // Get the short code or create one
    const shortName = deptCodes[deptName] || deptName
      .split(' ')
      .map(word => word[0])
      .join('')
      .substring(0, 3);

    // Return appropriate sheet name
    return isAnalysis ? `${shortName}_A` : shortName;
  };

  Object.entries(departmentData).forEach(([dept, students]) => {
    // Generate department analysis
    const analysis = generateDepartmentAnalysis(students);
    
    // Create sheet names and log them
    const mainSheetName = createSafeSheetName(dept);
    const analysisSheetName = createSafeSheetName(dept, true);
    
    console.log('Sheet names:', {
      department: dept,
      mainSheet: mainSheetName,
      analysisSheet: analysisSheetName
    });

    // Create main student data sheet
    const subjectCodes = new Set();
    students.forEach((student) => {
      Object.keys(student).forEach((key) => {
        if (
          key !== "registerNo" &&
          key !== "department" &&
          key !== "SGPA" &&
          key !== "FailedSubjects" &&
          key !== "analysis"
        ) {
          subjectCodes.add(key);
        }
      });
    });

    // Update headers to show credits
    const headers = ["Register No", 
      ...Array.from(subjectCodes).map(code => {
        const credit = SUBJECT_CREDITS[code] || 3;
        const isNonCredit = NON_CREDIT_COURSES.includes(code);
        return isNonCredit ? `${code}* (NC)` : `${code} (${credit})`;
      }), 
      "SGPA", "Failed Subjects"
    ];

    // Create student data sheet with safe sheet name
    const data = students.map((student) => {
      const row = [student.registerNo];
      Array.from(subjectCodes).forEach((code) => {
        row.push(student[code] || "-");
      });
      row.push(student.SGPA, student.FailedSubjects);
      return row;
    });

    const ws = xlsx.utils.aoa_to_sheet([headers, ...data]);
    xlsx.utils.book_append_sheet(workbook, ws, mainSheetName);

    // Create analysis sheet with safe sheet name
    const analysisData = [
      ["Department Analysis"],
      ["Total Students", analysis.totalStudents],
      ["Pass Count", analysis.passCount],
      ["Fail Count", analysis.failCount],
      ["Pass Percentage", `${analysis.passPercentage}%`],
      ["Average SGPA", analysis.averageSGPA],
      [],
      ["Toppers (SGPA >= 9.0)"],
      ["Register No", "SGPA"],
    ];

    // Get all toppers with SGPA >= 9.0
    const toppers = students
      .filter(student => student.SGPA >= 9.0)
      .sort((a, b) => b.SGPA - a.SGPA);  // Sort by SGPA in descending order

    // Add toppers to analysis
    if (toppers.length > 0) {
      toppers.forEach(topper => {
        analysisData.push([topper.registerNo, topper.SGPA]);
      });
    } else {
      analysisData.push(["No students with SGPA >= 9.0", ""]);
    }

    // Add spacing before next section
    analysisData.push([]);
    analysisData.push([]);

    // Continue with grade distribution
    analysisData.push(
      ["Grade Distribution"],
      ["Grade", "Count"],
      ...Object.entries(analysis.gradeDistribution),
      [],
      ["Subject-wise Analysis"],
      ["Subject", "Pass Count", "Fail Count", "Pass %"]
    );

    // Add subject-wise analysis
    Object.entries(analysis.subjectWiseAnalysis).forEach(([subject, data]) => {
      const passPercentage = ((data.passCount / (data.passCount + data.failCount)) * 100).toFixed(2);
      analysisData.push([
        subject,
        data.passCount,
        data.failCount,
        `${passPercentage}%`
      ]);
    });

    // Add credit information to analysis sheet
    analysisData.push([]);
    analysisData.push(["Subject Credits"]);
    analysisData.push(["Subject", "Credits"]);
    Array.from(subjectCodes)
      .filter(code => !NON_CREDIT_COURSES.includes(code))
      .forEach(code => {
        analysisData.push([code, SUBJECT_CREDITS[code] || 3]);
      });

    // Add non-credit courses note
    analysisData.push([]);
    analysisData.push(["Note: * indicates non-credit course (NC)"]);
    analysisData.push(["Non-credit courses:", NON_CREDIT_COURSES.join(", ")]);

    // Add SGPA calculation details to analysis sheet
    analysisData.push([]);
    analysisData.push(["SGPA Calculation Details"]);
    analysisData.push(["Formula: SGPA = Σ(Ci * GPi) / ΣCi"]);
    analysisData.push(["Where Ci = Course Credits, GPi = Grade Points"]);
    analysisData.push([]);
    analysisData.push(["Grade Points Scale"]);
    analysisData.push(["Grade", "Points"]);
    Object.entries(GRADE_POINTS)
      .filter(([grade]) => grade !== 'F' && grade !== 'FE' && grade !== 'I' && grade !== 'Absent')
      .forEach(([grade, points]) => {
        analysisData.push([grade, points]);
      });

    const analysisWs = xlsx.utils.aoa_to_sheet(analysisData);
    xlsx.utils.book_append_sheet(workbook, analysisWs, analysisSheetName);
  });

  return workbook;
};

// Add a test endpoint at the top of your routes
app.get('/test', (req, res) => {
  res.json({ message: 'Server is running' });
});

// API endpoint to upload and process PDF
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("No file uploaded.");
    }
    
    if (!req.file.mimetype || !req.file.mimetype.includes('pdf')) {
      return res.status(400).send("Uploaded file must be a PDF.");
    }

    const pdfBuffer = req.file.buffer;
    
    let departmentData;
    try {
      departmentData = await parsePDF(pdfBuffer);
      
      // Validate parsed data
      if (!departmentData || Object.keys(departmentData).length === 0) {
        throw new Error("No valid data could be extracted from the PDF");
      }

      // Check if we have student data
      const hasStudents = Object.values(departmentData).some(dept => dept.length > 0);
      if (!hasStudents) {
        throw new Error("No student records found in the PDF");
      }

      // Validate each student has required fields
      Object.values(departmentData).forEach(students => {
        students.forEach(student => {
          if (!student.registerNo || !student.department) {
            throw new Error("Invalid student data found");
          }
        });
      });

    } catch (error) {
      console.error("PDF parsing error:", error);
      return res.status(400).send(`Unable to parse PDF file: ${error.message}`);
    }

    const workbook = generateExcel(departmentData);

    // Generate a clean filename with date
    const date = new Date().toISOString().split('T')[0];
    const fileName = `results_${date}.xlsx`;

    // Set proper headers for Excel file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

    // Write to buffer and send
    const buffer = xlsx.write(workbook, { 
      type: 'buffer',
      bookType: 'xlsx'
    });

    // Send the buffer
    res.send(buffer);

  } catch (error) {
    console.error("Error processing PDF:", error);
    res.status(500).send(`Error processing PDF: ${error.message}`);
  }
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
