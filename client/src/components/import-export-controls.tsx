import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, Download, FileSpreadsheet, FileText, Sheet, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SheetInfo {
  name: string;
  rowCount: number;
}

interface DuplicateItem {
  id: string;
  type: 'constituency' | 'ward' | 'centre';
  existing: any;
  incoming: any;
  isIdentical: boolean;
  parentId?: string;
}

type DuplicateResolution = 'update' | 'skip';

export function ImportExportControls() {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [analyzingFile, setAnalyzingFile] = useState(false);
  const [availableSheets, setAvailableSheets] = useState<SheetInfo[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateItem[]>([]);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [duplicateResolutions, setDuplicateResolutions] = useState<{ [id: string]: DuplicateResolution }>({});
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

  const handleImport = async (resolutions?: { [id: string]: DuplicateResolution }) => {
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
    
    if (resolutions) {
      formData.append('handleDuplicates', 'resolve');
      formData.append('duplicateResolutions', JSON.stringify(resolutions));
    }

    try {
      const response = await fetch('/api/import/constituencies', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        if (result.requiresUserAction) {
          // Show duplicates for user review
          setDuplicates(result.duplicates || []);
          setShowDuplicates(true);
          
          // Initialize resolutions for non-identical duplicates
          const initialResolutions: { [id: string]: DuplicateResolution } = {};
          result.duplicates?.forEach((dup: DuplicateItem) => {
            if (!dup.isIdentical) {
              initialResolutions[dup.id] = 'update'; // Default to update
            }
          });
          setDuplicateResolutions(initialResolutions);
          
          toast({
            title: "Duplicates detected",
            description: `Found ${result.duplicates?.length || 0} duplicates. Please review and decide how to handle them.`,
            variant: "default",
          });
        } else {
          // Normal completion
          const identicalCount = result.duplicates?.filter((d: DuplicateItem) => d.isIdentical).length || 0;
          
          toast({
            title: "Import successful",
            description: `Imported ${result.success} items from sheet "${selectedSheet}". ${identicalCount > 0 ? `${identicalCount} identical items auto-merged. ` : ''}${result.errors?.length || 0} errors.`,
          });

          // Show errors if any
          if (result.errors && result.errors.length > 0) {
            console.log('Import errors:', result.errors);
          }

          // Reset state after successful import
          resetImportState();
        }
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

  const resetImportState = () => {
    setSelectedFile(null);
    setAvailableSheets([]);
    setSelectedSheet('');
    setDuplicates([]);
    setShowDuplicates(false);
    setDuplicateResolutions({});
    
    // Clear the file input
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleDuplicateResolution = (id: string, resolution: DuplicateResolution) => {
    setDuplicateResolutions(prev => ({
      ...prev,
      [id]: resolution
    }));
  };

  const handleBulkResolution = (resolution: DuplicateResolution) => {
    const newResolutions: { [id: string]: DuplicateResolution } = {};
    duplicates.forEach(dup => {
      if (!dup.isIdentical) {
        newResolutions[dup.id] = resolution;
      }
    });
    setDuplicateResolutions(newResolutions);
  };

  const proceedWithImport = () => {
    setShowDuplicates(false);
    handleImport(duplicateResolutions);
  };

  const formatDataForDisplay = (data: any, type: string) => {
    switch (type) {
      case 'constituency':
        return {
          'Name': data.name,
          'Code': data.code,
          'District': data.district,
          'State': data.state
        };
      case 'ward':
        return {
          'Name': data.name,
          'Code': data.code,
          'Constituency': data.constituencyId
        };
      case 'centre':
        return {
          'Name': data.name,
          'Code': data.code,
          'Ward': data.wardId,
          'Registered Voters': data.registeredVoters
        };
      default:
        return data;
    }
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
          <div className="grid gap-4 md:grid-cols-2">
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
                onClick={() => handleImport()}
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

      {/* Duplicate Resolution Dialog */}
      <Dialog open={showDuplicates} onOpenChange={setShowDuplicates}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Duplicates Detected
            </DialogTitle>
            <DialogDescription>
              Found {duplicates.length} existing records. Choose how to handle each one:
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex gap-2 text-sm">
              <Badge variant="secondary">
                {duplicates.filter(d => d.isIdentical).length} identical (auto-merged)
              </Badge>
              <Badge variant="outline">
                {duplicates.filter(d => !d.isIdentical).length} different (need review)
              </Badge>
            </div>

            {/* Bulk Actions */}
            {duplicates.some(d => !d.isIdentical) && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkResolution('update')}
                >
                  Update All Different
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkResolution('skip')}
                >
                  Skip All Different
                </Button>
              </div>
            )}

            {/* Duplicates List */}
            <ScrollArea className="max-h-96">
              <div className="space-y-4">
                {duplicates.map((duplicate) => {
                  const formattedExisting = formatDataForDisplay(duplicate.existing, duplicate.type);
                  const formattedIncoming = formatDataForDisplay(duplicate.incoming, duplicate.type);
                  
                  return (
                    <Card key={duplicate.id} className={duplicate.isIdentical ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">
                              {duplicate.type}
                            </Badge>
                            <span className="font-medium">{duplicate.id}</span>
                            {duplicate.isIdentical ? (
                              <Badge variant="default" className="bg-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Identical - Auto-merged
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <XCircle className="h-3 w-3 mr-1" />
                                Different - Needs Review
                              </Badge>
                            )}
                          </div>
                          
                          {!duplicate.isIdentical && (
                            <Select
                              value={duplicateResolutions[duplicate.id] || 'update'}
                              onValueChange={(value: DuplicateResolution) => 
                                handleDuplicateResolution(duplicate.id, value)
                              }
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="update">Update</SelectItem>
                                <SelectItem value="skip">Skip</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </CardHeader>
                      
                      {!duplicate.isIdentical && (
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-medium text-sm mb-2 text-red-700">Existing Data</h4>
                              <div className="space-y-1 text-xs">
                                {Object.entries(formattedExisting).map(([key, value]) => (
                                  <div key={key} className="flex justify-between">
                                    <span className="text-muted-foreground">{key}:</span>
                                    <span className="font-mono">{String(value)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="font-medium text-sm mb-2 text-blue-700">Incoming Data</h4>
                              <div className="space-y-1 text-xs">
                                {Object.entries(formattedIncoming).map(([key, value]) => (
                                  <div key={key} className="flex justify-between">
                                    <span className="text-muted-foreground">{key}:</span>
                                    <span className="font-mono">{String(value)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowDuplicates(false)}
                disabled={importing}
              >
                Cancel
              </Button>
              <Button
                onClick={proceedWithImport}
                disabled={importing}
              >
                {importing ? 'Processing...' : 'Proceed with Import'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}