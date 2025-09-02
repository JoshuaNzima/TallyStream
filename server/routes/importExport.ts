import { Router } from 'express';
import multer from 'multer';
import { ExcelImporter } from '../utils/excelImport';
import { ExportUtils } from '../utils/exportUtils';
import { storage } from '../storage';
import { isAuthenticated } from '../auth';
import ExcelJS from 'exceljs';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept Excel files
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  },
});

const excelImporter = new ExcelImporter(storage);
const exportUtils = new ExportUtils(storage);

// Get available sheets from an Excel file
router.post('/import/sheets', isAuthenticated, upload.single('file'), async (req: any, res) => {
  try {
    // Check admin permission
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const sheets = excelImporter.getAvailableSheets(req.file.buffer);
    
    res.json({
      sheets,
      totalSheets: sheets.length,
    });
  } catch (error) {
    console.error('Sheets analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze Excel file', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Import constituencies from Excel
router.post('/import/constituencies', isAuthenticated, upload.single('file'), async (req: any, res) => {
  try {
    // Check admin permission
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get options from request body
    const sheetName = req.body.sheetName;
    const handleDuplicates = req.body.handleDuplicates || 'prompt'; // 'prompt', 'update', 'skip', 'merge'
    const duplicateResolutions = req.body.duplicateResolutions ? JSON.parse(req.body.duplicateResolutions) : undefined;

    const result = await excelImporter.importFromBuffer(req.file.buffer, sheetName, {
      handleDuplicates,
      duplicateResolutions
    });
    
    if (result.requiresUserAction) {
      // Return duplicates for user to review
      res.json({
        requiresUserAction: true,
        duplicates: result.duplicates,
        message: 'Duplicates detected. Please review and provide resolution instructions.',
        success: 0,
        errors: result.errors,
      });
    } else {
      // Normal completion
      res.json({
        message: 'Import completed',
        success: result.success,
        errors: result.errors,
        duplicates: result.duplicates,
      });
    }
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ 
      error: 'Import failed', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Export results to Excel
router.get('/export/results/excel', isAuthenticated, async (req: any, res) => {
  try {
    const buffer = await exportUtils.exportResultsToExcel();
    
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=election-results-${new Date().toISOString().slice(0, 10)}.xlsx`,
      'Content-Length': buffer.length.toString(),
    });
    
    res.send(buffer);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ 
      error: 'Export failed', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Export constituencies to Excel
router.get('/export/constituencies/excel', isAuthenticated, async (req: any, res) => {
  try {
    const buffer = await exportUtils.exportConstituenciesToExcel();
    
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=constituencies-${new Date().toISOString().slice(0, 10)}.xlsx`,
      'Content-Length': buffer.length.toString(),
    });
    
    res.send(buffer);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ 
      error: 'Export failed', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Export results to PDF
router.get('/export/results/pdf', isAuthenticated, async (req: any, res) => {
  try {
    const buffer = await exportUtils.exportResultsToPDF();
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=election-results-${new Date().toISOString().slice(0, 10)}.pdf`,
      'Content-Length': buffer.length.toString(),
    });
    
    res.send(buffer);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ 
      error: 'Export failed', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Export summary to PDF
router.get('/export/summary/pdf', isAuthenticated, async (req: any, res) => {
  try {
    const buffer = await exportUtils.exportSummaryToPDF();
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=election-summary-${new Date().toISOString().slice(0, 10)}.pdf`,
      'Content-Length': buffer.length.toString(),
    });
    
    res.send(buffer);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ 
      error: 'Export failed', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Generate and download Excel template for constituency import
router.get('/template/constituencies', isAuthenticated, async (req: any, res) => {
  try {
    // Check admin permission
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Constituency Template');

    // Add headers
    worksheet.columns = [
      { header: 'Constituency', key: 'constituency', width: 30 },
      { header: 'District', key: 'district', width: 20 },
      { header: 'Region', key: 'region', width: 20 },
      { header: 'Ward', key: 'ward', width: 30 },
      { header: 'Centre', key: 'centre', width: 40 },
      { header: 'Voters', key: 'voters', width: 15 }
    ];

    // Add sample data to show the format
    const sampleData = [
      {
        constituency: '107 - LILONGWE CITY',
        district: 'Lilongwe',
        region: 'Central',
        ward: '10701 - MTANDIRE',
        centre: '1070101 - KANKODOLA L.E.A. SCHOOL',
        voters: 7432
      },
      {
        constituency: '107 - LILONGWE CITY',
        district: 'Lilongwe',
        region: 'Central',
        ward: '10701 - MTANDIRE',
        centre: '1070102 - MTANDIRE COMMUNITY CENTRE',
        voters: 6789
      },
      {
        constituency: '107 - LILONGWE CITY',
        district: 'Lilongwe',
        region: 'Central',
        ward: '10702 - CHINSAPO',
        centre: '1070201 - CHINSAPO PRIMARY SCHOOL',
        voters: 5432
      },
      {
        constituency: '108 - LILONGWE SOUTH',
        district: 'Lilongwe',
        region: 'Central',
        ward: '10801 - AREA 25',
        centre: '1080101 - AREA 25 COMMUNITY HALL',
        voters: 8901
      }
    ];

    // Add the sample data
    sampleData.forEach(row => {
      worksheet.addRow(row);
    });

    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F3FF' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Add borders to data rows
    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    }

    // Add instructions worksheet
    const instructionsSheet = workbook.addWorksheet('Instructions');
    instructionsSheet.columns = [
      { header: 'Instructions for Data Import', key: 'instructions', width: 80 }
    ];

    const instructions = [
      'Instructions for Data Import',
      '',
      '1. FORMAT REQUIREMENTS:',
      '   - Constituency format: "NUMBER - NAME" (e.g., "107 - LILONGWE CITY")',
      '   - Ward format: "NUMBER - NAME" (e.g., "10701 - MTANDIRE")',
      '   - Centre format: "NUMBER - NAME" (e.g., "1070101 - KANKODOLA L.E.A. SCHOOL")',
      '   - Voters: Must be a positive number',
      '',
      '2. ID HIERARCHY:',
      '   - Constituency ID: 3 digits (e.g., 107)',
      '   - Ward ID: Constituency ID + 2 digits (e.g., 10701)',
      '   - Centre ID: Ward ID + 2 digits (e.g., 1070101)',
      '',
      '3. RULES:',
      '   - All fields are required',
      '   - IDs must follow the hierarchical pattern',
      '   - Names should be in UPPERCASE',
      '   - Voters count must be realistic (1-50,000)',
      '',
      '4. SAMPLE DATA:',
      '   - Check the "Constituency Template" sheet for examples',
      '   - Replace sample data with your actual data',
      '   - Keep the header row intact',
      '',
      '5. UPLOAD:',
      '   - Save file as .xlsx format',
      '   - Upload through Data Management page',
      '   - Check for any import errors after upload'
    ];

    instructions.forEach((instruction, index) => {
      if (index === 0) {
        const cell = instructionsSheet.addRow([instruction]).getCell(1);
        cell.font = { bold: true, size: 16 };
      } else {
        instructionsSheet.addRow([instruction]);
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=constituency-import-template.xlsx',
      'Content-Length': Buffer.byteLength(buffer).toString(),
    });

    res.send(buffer);
  } catch (error) {
    console.error('Template generation error:', error);
    res.status(500).json({ 
      error: 'Template generation failed', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});


// Generate and download CSV template for candidates import
router.get('/template/candidates', isAuthenticated, async (req: any, res) => {
  try {
    // Check admin permission
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Candidates Template');

    // Add headers
    worksheet.columns = [
      { header: 'name', key: 'name', width: 30 },
      { header: 'party', key: 'party', width: 25 },
      { header: 'category', key: 'category', width: 15 },
      { header: 'constituency', key: 'constituency', width: 30 },
      { header: 'abbreviation', key: 'abbreviation', width: 15 }
    ];

    // Add sample data
    const sampleData = [
      {
        name: 'JOHN BANDA',
        party: 'DEMOCRATIC PROGRESSIVE PARTY',
        category: 'president',
        constituency: '',
        abbreviation: 'DPP'
      },
      {
        name: 'MARY PHIRI',
        party: 'MALAWI CONGRESS PARTY',
        category: 'mp',
        constituency: 'LILONGWE CITY',
        abbreviation: 'MCP'
      },
      {
        name: 'PETER MWALE',
        party: 'UNITED TRANSFORMATION MOVEMENT',
        category: 'councilor',
        constituency: 'LILONGWE SOUTH',
        abbreviation: 'UTM'
      }
    ];

    // Add the sample data
    sampleData.forEach(row => {
      worksheet.addRow(row);
    });

    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F3FF' }
      };
    });

    const buffer = await workbook.xlsx.writeBuffer();

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=candidates-template.xlsx',
      'Content-Length': Buffer.byteLength(buffer).toString(),
    });

    res.send(buffer);
  } catch (error) {
    console.error('Template generation error:', error);
    res.status(500).json({ 
      error: 'Template generation failed', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Generate and download CSV template for candidate import
router.get('/template/candidates-csv', isAuthenticated, async (req: any, res) => {
  try {
    // Check admin permission
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Create CSV content with headers
    const headers = [
      'Name',
      'Abbreviation', 
      'Political Party',
      'Category',
      'Constituency/Ward',
      'Phone',
      'Email'
    ];

    // Sample data to show the format
    const sampleRows = [
      ['John Doe', 'JD', 'Democratic Progressive Party', 'president', '', '+265123456789', 'john.doe@example.com'],
      ['Jane Smith', 'JS', 'Malawi Congress Party', 'mp', 'Lilongwe Central', '+265987654321', 'jane.smith@example.com'],
      ['Mike Johnson', 'MJ', 'United Transformation Movement', 'councilor', 'Mtandire', '+265555123456', 'mike.johnson@example.com'],
      ['Sarah Wilson', 'SW', 'Democratic Progressive Party', 'president', '', '+265111222333', 'sarah.wilson@example.com']
    ];

    // Convert to CSV format
    const csvContent = [
      headers.join(','),
      ...sampleRows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename=candidates-template-${new Date().toISOString().slice(0, 10)}.csv`,
      'Content-Length': Buffer.byteLength(csvContent).toString(),
    });
    
    res.send(csvContent);
  } catch (error) {
    console.error('CSV template generation error:', error);
    res.status(500).json({ 
      error: 'CSV template generation failed', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;