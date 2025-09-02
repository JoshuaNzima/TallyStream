import { Router } from 'express';
import multer from 'multer';
import { ExcelImporter } from '../utils/excelImport';
import { ExportUtils } from '../utils/exportUtils';
import { storage } from '../storage';

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

// Import constituencies from Excel
router.post('/import/constituencies', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const result = await excelImporter.importFromBuffer(req.file.buffer);
    
    res.json({
      message: 'Import completed',
      success: result.success,
      errors: result.errors,
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ 
      error: 'Import failed', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Export results to Excel
router.get('/export/results/excel', async (req, res) => {
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
router.get('/export/constituencies/excel', async (req, res) => {
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
router.get('/export/results/pdf', async (req, res) => {
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
router.get('/export/summary/pdf', async (req, res) => {
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

export default router;