'use client';

import React, { useState } from 'react';
import { Button } from './button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Checkbox } from './checkbox';
import { Label } from './label';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './dialog';
import { Badge } from './badge';
import { Separator } from './separator';
import {
  Download,
  FileText,
  FileSpreadsheet,
  File,
  Settings,
  CheckCircle
} from 'lucide-react';
import { exportToCSV, exportToJSON, formatDate } from '../../lib/utils';
import { toast } from 'sonner';

interface ExportColumn {
  key: string;
  label: string;
  type?: 'text' | 'date' | 'number' | 'boolean';
  format?: (value: any) => string;
}

interface ExportToolsProps {
  data: any[];
  filename: string;
  columns: ExportColumn[];
  title?: string;
  onExport?: (format: 'csv' | 'json' | 'pdf', selectedColumns: string[], options: any) => void;
  enablePDF?: boolean;
  enableJSON?: boolean;
  enableCSV?: boolean;
  className?: string;
}

export function ExportTools({
  data,
  filename,
  columns,
  title = 'Export Data',
  onExport,
  enablePDF = true,
  enableJSON = true,
  enableCSV = true,
  className = ''
}: ExportToolsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    columns.map(col => col.key)
  );
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'pdf'>('csv');
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [dateFormat, setDateFormat] = useState('MM/dd/yyyy');
  const [isExporting, setIsExporting] = useState(false);

  const handleColumnToggle = (columnKey: string) => {
    setSelectedColumns(prev =>
      prev.includes(columnKey)
        ? prev.filter(key => key !== columnKey)
        : [...prev, columnKey]
    );
  };

  const formatExportData = () => {
    return data.map(item => {
      const formattedItem: any = {};

      selectedColumns.forEach(colKey => {
        const column = columns.find(col => col.key === colKey);
        if (!column) return;

        let value = item[column.key];

        // Apply custom formatting if provided
        if (column.format) {
          value = column.format(value);
        } else if (column.type === 'date' && value) {
          value = formatDate(value);
        } else if (column.type === 'boolean') {
          value = value ? 'Yes' : 'No';
        } else if (column.type === 'number' && typeof value === 'number') {
          value = value.toString();
        }

        formattedItem[column.label] = value;
      });

      return formattedItem;
    });
  };

  const handleExport = async () => {
    if (selectedColumns.length === 0) {
      toast.error('Please select at least one column to export');
      return;
    }

    setIsExporting(true);

    try {
      const exportData = formatExportData();
      const timestamp = formatDate(new Date()).replace(/\//g, '-');
      const fullFilename = `${filename}-${timestamp}`;

      if (onExport) {
        // Custom export handler
        await onExport(exportFormat, selectedColumns, {
          data: exportData,
          filename: fullFilename,
          includeHeaders,
          dateFormat
        });
      } else {
        // Default export handlers
        switch (exportFormat) {
          case 'csv':
            exportToCSV(exportData, `${fullFilename}.csv`);
            break;
          case 'json':
            exportToJSON(exportData, `${fullFilename}.json`);
            break;
          case 'pdf':
            // PDF export would require additional library like jsPDF
            toast.error('PDF export not implemented yet');
            break;
        }
      }

      toast.success(`Data exported successfully as ${exportFormat.toUpperCase()}`);
      setIsOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'csv':
        return <FileSpreadsheet className="w-4 h-4" />;
      case 'json':
        return <File className="w-4 h-4" />;
      case 'pdf':
        return <FileText className="w-4 h-4" />;
      default:
        return <Download className="w-4 h-4" />;
    }
  };

  const getFormatDescription = (format: string) => {
    switch (format) {
      case 'csv':
        return 'Comma-separated values, compatible with Excel and most spreadsheet applications';
      case 'json':
        return 'JavaScript Object Notation, suitable for developers and data processing';
      case 'pdf':
        return 'Portable Document Format, ideal for reports and printing';
      default:
        return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={className}>
          <Download className="w-4 h-4 mr-2" />
          Export Data
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Format Selection */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Export Format</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {enableCSV && (
                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    exportFormat === 'csv'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setExportFormat('csv')}
                >
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-8 h-8 text-green-600" />
                    <div>
                      <div className="font-medium">CSV</div>
                      <div className="text-sm text-gray-600">Spreadsheet format</div>
                    </div>
                    {exportFormat === 'csv' && (
                      <CheckCircle className="w-5 h-5 text-blue-500 ml-auto" />
                    )}
                  </div>
                </div>
              )}

              {enableJSON && (
                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    exportFormat === 'json'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setExportFormat('json')}
                >
                  <div className="flex items-center gap-3">
                    <File className="w-8 h-8 text-blue-600" />
                    <div>
                      <div className="font-medium">JSON</div>
                      <div className="text-sm text-gray-600">Developer format</div>
                    </div>
                    {exportFormat === 'json' && (
                      <CheckCircle className="w-5 h-5 text-blue-500 ml-auto" />
                    )}
                  </div>
                </div>
              )}

              {enablePDF && (
                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    exportFormat === 'pdf'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setExportFormat('pdf')}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-red-600" />
                    <div>
                      <div className="font-medium">PDF</div>
                      <div className="text-sm text-gray-600">Document format</div>
                    </div>
                    {exportFormat === 'pdf' && (
                      <CheckCircle className="w-5 h-5 text-blue-500 ml-auto" />
                    )}
                  </div>
                </div>
              )}
            </div>

            <p className="text-sm text-gray-600">
              {getFormatDescription(exportFormat)}
            </p>
          </div>

          <Separator />

          {/* Column Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Select Columns</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedColumns(columns.map(col => col.key))}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedColumns([])}
                >
                  Clear All
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
              {columns.map(column => (
                <div key={column.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={column.key}
                    checked={selectedColumns.includes(column.key)}
                    onCheckedChange={() => handleColumnToggle(column.key)}
                  />
                  <Label htmlFor={column.key} className="text-sm">
                    {column.label}
                  </Label>
                  <Badge variant="outline" className="text-xs">
                    {column.type || 'text'}
                  </Badge>
                </div>
              ))}
            </div>

            <div className="text-sm text-gray-600">
              {selectedColumns.length} of {columns.length} columns selected
            </div>
          </div>

          <Separator />

          {/* Export Options */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Export Options</Label>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-headers"
                  checked={includeHeaders}
                  onCheckedChange={(checked) => setIncludeHeaders(checked === true)}
                />
                <Label htmlFor="include-headers" className="text-sm">
                  Include column headers
                </Label>
              </div>

              {exportFormat === 'csv' && (
                <div className="flex items-center space-x-2">
                  <Label htmlFor="date-format" className="text-sm">Date Format:</Label>
                  <Select value={dateFormat} onValueChange={setDateFormat}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MM/dd/yyyy">MM/dd/yyyy</SelectItem>
                      <SelectItem value="dd/MM/yyyy">dd/MM/yyyy</SelectItem>
                      <SelectItem value="yyyy-MM-dd">yyyy-MM-dd</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Export Summary */}
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span>Total Records:</span>
                  <Badge variant="outline">{data.length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Selected Columns:</span>
                  <Badge variant="outline">{selectedColumns.length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Export Format:</span>
                  <Badge variant="outline">{exportFormat.toUpperCase()}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting || selectedColumns.length === 0}
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Exporting...
                </>
              ) : (
                <>
                  {getFormatIcon(exportFormat)}
                  <span className="ml-2">Export {exportFormat.toUpperCase()}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}