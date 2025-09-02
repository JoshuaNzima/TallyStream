import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { DatabaseStorage } from '../storage';

export class ExportUtils {
  constructor(private storage: DatabaseStorage) {}

  async exportResultsToExcel(): Promise<Buffer> {
    const results = await this.storage.getAllResultsWithDetails();
    
    const excelData = results.map((result: any) => ({
      'Centre ID': result.pollingCenter?.centreId || 'N/A',
      'Centre Name': result.pollingCenter?.name || 'N/A',
      'Ward': result.pollingCenter?.constituency || 'N/A', // Legacy field
      'Constituency': result.pollingCenter?.constituency || 'N/A',
      'Category': result.category,
      'Total Votes': result.totalVotes,
      'Invalid Votes': result.invalidVotes,
      'Status': result.status,
      'Submitted By': `${result.submitter?.firstName} ${result.submitter?.lastName}`,
      'Submitted At': result.createdAt?.toISOString(),
      'Verified By': result.verifier ? `${result.verifier.firstName} ${result.verifier.lastName}` : 'Not Verified',
      'Verified At': result.verifiedAt?.toISOString() || 'Not Verified',
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Election Results');
    
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  async exportConstituenciesToExcel(): Promise<Buffer> {
    const constituencies = await this.storage.getAllConstituenciesWithHierarchy();
    
    const excelData: any[] = [];
    
    for (const constituency of constituencies) {
      for (const ward of (constituency as any).wards || []) {
        for (const centre of (ward as any).centres || []) {
          excelData.push({
            'Constituency': `${constituency.id} - ${constituency.name}`,
            'Ward': `${ward.id} - ${ward.name}`,
            'Centre': `${centre.id} - ${centre.name}`,
            'Voters': centre.registeredVoters
          });
        }
      }
    }

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Constituencies');
    
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  async exportResultsToPDF(): Promise<Buffer> {
    const results = await this.storage.getAllResultsWithDetails();
    
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(16);
    doc.text('Election Results Report', 14, 22);
    
    // Subtitle with timestamp
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 32);
    
    // Prepare table data
    const tableData = results.map((result: any) => [
      result.pollingCenter?.name || 'N/A',
      result.category,
      result.totalVotes.toString(),
      result.invalidVotes.toString(),
      result.status,
      `${result.submitter?.firstName || ''} ${result.submitter?.lastName || ''}`.trim(),
      result.createdAt?.toLocaleDateString() || 'N/A'
    ]);

    // Add table
    (doc as any).autoTable({
      head: [['Centre', 'Category', 'Total Votes', 'Invalid Votes', 'Status', 'Submitted By', 'Date']],
      body: tableData,
      startY: 40,
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 20 },
        2: { cellWidth: 20 },
        3: { cellWidth: 20 },
        4: { cellWidth: 20 },
        5: { cellWidth: 30 },
        6: { cellWidth: 25 }
      }
    });

    return Buffer.from(doc.output('arraybuffer'));
  }

  async exportSummaryToPDF(): Promise<Buffer> {
    const results = await this.storage.getAllResultsWithDetails();
    
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(16);
    doc.text('Election Summary Report', 14, 22);
    
    // Statistics
    const totalCentres = new Set(results.map((r: any) => r.pollingCenterId)).size;
    const verifiedResults = results.filter((r: any) => r.status === 'verified').length;
    const pendingResults = results.filter((r: any) => r.status === 'pending').length;
    const flaggedResults = results.filter((r: any) => r.status === 'flagged').length;
    
    doc.setFontSize(12);
    let y = 40;
    doc.text(`Total Centres Reporting: ${totalCentres}`, 14, y);
    y += 10;
    doc.text(`Verified Results: ${verifiedResults}`, 14, y);
    y += 10;
    doc.text(`Pending Verification: ${pendingResults}`, 14, y);
    y += 10;
    doc.text(`Flagged Results: ${flaggedResults}`, 14, y);
    y += 20;

    // Summary by category
    const categories = ['president', 'mp', 'councilor'] as const;
    
    for (const category of categories) {
      const categoryResults = results.filter((r: any) => r.category === category);
      if (categoryResults.length === 0) continue;

      doc.setFontSize(14);
      doc.text(`${category.toUpperCase()} RESULTS`, 14, y);
      y += 10;

      const totalVotes = categoryResults.reduce((sum: number, r: any) => sum + r.totalVotes, 0);
      const totalInvalid = categoryResults.reduce((sum: number, r: any) => sum + r.invalidVotes, 0);

      doc.setFontSize(10);
      doc.text(`Total Valid Votes: ${totalVotes - totalInvalid}`, 14, y);
      y += 8;
      doc.text(`Invalid Votes: ${totalInvalid}`, 14, y);
      y += 8;
      doc.text(`Total Votes Cast: ${totalVotes}`, 14, y);
      y += 15;
    }

    return Buffer.from(doc.output('arraybuffer'));
  }
}