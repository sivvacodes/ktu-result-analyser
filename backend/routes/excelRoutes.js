const express = require('express');
const { generateExcel } = require('../utils/excelGenerator');

const router = express.Router();

router.post('/generate-excel', async (req, res) => {
  try {
    const workbook = await generateExcel(req.body);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=result-analysis.xlsx');
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Excel generation error:', error);
    res.status(500).json({ error: 'Failed to generate Excel file' });
  }
});

module.exports = router; 