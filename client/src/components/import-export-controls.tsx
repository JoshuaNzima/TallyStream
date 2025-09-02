import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, Download, FileSpreadsheet, FileText, Sheet } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SheetInfo {
  name: string;
  rowCount: number;
}

export function ImportExportControls() {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [analyzingFile, setAnalyzingFile] = useState(false);
  const [availableSheets, setAvailableSheets] = useState<SheetInfo[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an Excel file (.xlsx or .xls)",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setAnalyzingFile(true);
    setAvailableSheets([]);
    setSelectedSheet('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/import/sheets', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setAvailableSheets(result.sheets);
        
        // If only one sheet, auto-select it
        if (result.sheets.length === 1) {
          setSelectedSheet(result.sheets[0].name);
        }

        toast({
          title: "File analyzed",
          description: `Found ${result.totalSheets} sheet(s). ${result.sheets.length === 1 ? 'Ready to import.' : 'Please select a sheet to import.'}`,
        });
      } else {
        toast({
          title: "Analysis failed",
          description: result.error || "Failed to analyze file",
          variant: "destructive",
        });
        // Clear file selection on error
        setSelectedFile(null);
        event.target.value = '';
      }
    } catch (error) {
      toast({
        title: "Analysis failed",
        description: "Network error during file analysis",
        variant: "destructive",
      });
      // Clear file selection on error
      setSelectedFile(null);
      event.target.value = '';
    } finally {
      setAnalyzingFile(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !selectedSheet) {
      toast({
        title: "Missing selection",
        description: "Please select a file and sheet to import",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('sheetName', selectedSheet);

    try {
      const response = await fetch('/api/import/constituencies', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Import successful",
          description: `Imported ${result.success} items from sheet "${selectedSheet}". ${result.errors.length} errors.`,
        });

        // Show errors if any
        if (result.errors.length > 0) {
          console.log('Import errors:', result.errors);
        }

        // Reset state after successful import
        setSelectedFile(null);
        setAvailableSheets([]);
        setSelectedSheet('');
        
        // Clear the file input
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        toast({
          title: "Import failed",
          description: result.error || "Failed to import data",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Import failed",
        description: "Network error during import",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const resetFileSelection = () => {
    setSelectedFile(null);
    setAvailableSheets([]);
    setSelectedSheet('');
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleTemplateDownload = async (type: 'constituencies' | 'polling-centers' | 'candidates') => {
    setExporting(true);

    try {
      const response = await fetch(`/api/template/${type}`);

      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        
        let filename = '';
        switch (type) {
          case 'constituencies':
            filename = 'constituency-import-template.xlsx';
            break;
          case 'polling-centers':
            filename = 'polling-centers-template.xlsx';
            break;
          case 'candidates':
            filename = 'candidates-template.xlsx';
            break;
        }
        
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);

        toast({
          title: "Template downloaded",
          description: `${filename} has been downloaded`,
        });
      } else {
        const error = await response.json();
        toast({
          title: "Download failed",
          description: error.error || "Failed to download template",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Network error during template download",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExport = async (type: 'results-excel' | 'results-pdf' | 'constituencies-excel' | 'summary-pdf') => {
    setExporting(true);

    try {
      let url = '';
      let filename = '';

      switch (type) {
        case 'results-excel':
          url = '/api/export/results/excel';
          filename = `election-results-${new Date().toISOString().slice(0, 10)}.xlsx`;
          break;
        case 'results-pdf':
          url = '/api/export/results/pdf';
          filename = `election-results-${new Date().toISOString().slice(0, 10)}.pdf`;
          break;
        case 'constituencies-excel':
          url = '/api/export/constituencies/excel';
          filename = `constituencies-${new Date().toISOString().slice(0, 10)}.xlsx`;
          break;
        case 'summary-pdf':
          url = '/api/export/summary/pdf';
          filename = `election-summary-${new Date().toISOString().slice(0, 10)}.pdf`;
          break;
      }

      const response = await fetch(url);

      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);

        toast({
          title: "Export successful",
          description: `${filename} has been downloaded`,
        });
      } else {
        const error = await response.json();
        toast({
          title: "Export failed",
          description: error.error || "Failed to export data",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Network error during export",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Templates Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Download Templates
          </CardTitle>
          <CardDescription>
            Download Excel templates with sample data and instructions for importing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Constituencies</h4>
              <p className="text-xs text-muted-foreground">
                Hierarchical constituency, ward, and centre data
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTemplateDownload('constituencies')}
                disabled={importing || exporting}
                data-testid="button-download-template-constituencies"
                className="w-full"
              >
                <Download className="h-4 w-4 mr-1" />
                Download Template
              </Button>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Polling Centers</h4>
              <p className="text-xs text-muted-foreground">
                Polling center locations and details
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTemplateDownload('polling-centers')}
                disabled={importing || exporting}
                data-testid="button-download-template-polling-centers"
                className="w-full"
              >
                <Download className="h-4 w-4 mr-1" />
                Download Template
              </Button>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Candidates</h4>
              <p className="text-xs text-muted-foreground">
                Candidate names, parties, and categories
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTemplateDownload('candidates')}
                disabled={importing || exporting}
                data-testid="button-download-template-candidates"
                className="w-full"
              >
                <Download className="h-4 w-4 mr-1" />
                Download Template
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Import Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import Data
            </CardTitle>
            <CardDescription>
              Upload Excel files to import constituencies, wards, and centres data
            </CardDescription>
          </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file-upload">Select Excel File</Label>
            <Input
              id="file-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              disabled={importing || analyzingFile}
              data-testid="input-file-upload"
            />
            <p className="text-sm text-muted-foreground">
              Expected format: Constituency, Ward, Centre, Voters columns
            </p>
          </div>

          {/* Sheet Selection */}
          {availableSheets.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="sheet-select">Select Sheet to Import</Label>
              <Select value={selectedSheet} onValueChange={setSelectedSheet}>
                <SelectTrigger id="sheet-select" data-testid="select-sheet">
                  <SelectValue placeholder="Choose a sheet..." />
                </SelectTrigger>
                <SelectContent>
                  {availableSheets.map((sheet) => (
                    <SelectItem key={sheet.name} value={sheet.name}>
                      <div className="flex items-center gap-2">
                        <Sheet className="h-4 w-4" />
                        <span>{sheet.name}</span>
                        <span className="text-muted-foreground text-xs">
                          ({sheet.rowCount} rows)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Selected Sheet Info */}
          {selectedSheet && availableSheets.length > 0 && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 text-sm">
                <Sheet className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Selected Sheet:</span>
                <span>{selectedSheet}</span>
                <span className="text-muted-foreground">
                  ({availableSheets.find(s => s.name === selectedSheet)?.rowCount || 0} rows)
                </span>
              </div>
            </div>
          )}

          {/* Import Button */}
          {selectedFile && selectedSheet && (
            <div className="flex gap-2">
              <Button
                onClick={handleImport}
                disabled={importing || !selectedSheet}
                className="flex-1"
                data-testid="button-import"
              >
                <Upload className="h-4 w-4 mr-2" />
                {importing ? 'Importing...' : `Import from "${selectedSheet}"`}
              </Button>
              <Button
                variant="outline"
                onClick={resetFileSelection}
                disabled={importing}
                data-testid="button-reset"
              >
                Reset
              </Button>
            </div>
          )}
          
          <div className="bg-muted p-3 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Expected Excel Format:</h4>
            <div className="text-xs space-y-1">
              <div><strong>Constituency:</strong> 107 - LILONGWE CITY</div>
              <div><strong>Ward:</strong> 10701 - MTANDIRE</div>
              <div><strong>Centre:</strong> 1070101 - KANKODOLA L.E.A. SCHOOL</div>
              <div><strong>Voters:</strong> 7432</div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              💡 Download the template above for exact format and instructions
            </p>
          </div>

          {/* Status Messages */}
          {analyzingFile && (
            <div className="text-sm text-center text-muted-foreground">
              Analyzing Excel file, please wait...
            </div>
          )}
          
          {importing && (
            <div className="text-sm text-center text-muted-foreground">
              Importing data, please wait...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data
          </CardTitle>
          <CardDescription>
            Download results and data in various formats
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-sm mb-2">Election Results</h4>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('results-excel')}
                  disabled={exporting}
                  data-testid="button-export-results-excel"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('results-pdf')}
                  disabled={exporting}
                  data-testid="button-export-results-pdf"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  PDF
                </Button>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium text-sm mb-2">Summary Reports</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('summary-pdf')}
                disabled={exporting}
                data-testid="button-export-summary-pdf"
              >
                <FileText className="h-4 w-4 mr-1" />
                Summary PDF
              </Button>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium text-sm mb-2">Location Data</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('constituencies-excel')}
                disabled={exporting}
                data-testid="button-export-constituencies-excel"
              >
                <FileSpreadsheet className="h-4 w-4 mr-1" />
                Constituencies Excel
              </Button>
            </div>
          </div>

          {exporting && (
            <div className="text-sm text-center text-muted-foreground">
              Preparing download, please wait...
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}