import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export function ImportExportControls() {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/import/constituencies', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Import successful",
          description: `Imported ${result.success} items. ${result.errors.length} errors.`,
        });

        // Show errors if any
        if (result.errors.length > 0) {
          console.log('Import errors:', result.errors);
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
      // Clear the input
      event.target.value = '';
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
              onChange={handleFileUpload}
              disabled={importing}
              data-testid="input-file-upload"
            />
            <p className="text-sm text-muted-foreground">
              Expected format: Constituency, Ward, Centre, Voters columns
            </p>
          </div>
          
          <div className="bg-muted p-3 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Expected Excel Format:</h4>
            <div className="text-xs space-y-1">
              <div><strong>Constituency:</strong> 107 - LILONGWE CITY</div>
              <div><strong>Ward:</strong> 10701 - MTANDIRE</div>
              <div><strong>Centre:</strong> 1070101 - KANKODOLA L.E.A. SCHOOL</div>
              <div><strong>Voters:</strong> 7432</div>
            </div>
          </div>

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
  );
}