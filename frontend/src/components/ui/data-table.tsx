'use client';

import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table';
import { Button } from './button';
import { Input } from './input';
import { Checkbox } from './checkbox';
import { Badge } from './badge';
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Search,
  Filter,
  MoreHorizontal,
  ArrowUpDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { AdvancedFilter } from './advanced-filter';
import { ExportTools } from './export-tools';
import {
  FilterOption,
  SearchConfig,
  SortOption,
  filterBySearch,
  sortByField,
  paginate,
  exportToCSV
} from '../../lib/utils';

interface Column<T = any> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  type?: 'text' | 'date' | 'number' | 'boolean' | 'badge' | 'actions';
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T = any> {
  data: T[];
  columns: Column<T>[];
  searchConfig?: SearchConfig;
  filterOptions?: FilterOption[];
  sortOptions?: SortOption[];
  enableSelection?: boolean;
  enableExport?: boolean;
  enablePagination?: boolean;
  pageSize?: number;
  onRowClick?: (row: T) => void;
  onSelectionChange?: (selectedRows: T[]) => void;
  actions?: (row: T) => React.ReactNode;
  className?: string;
  loading?: boolean;
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchConfig,
  filterOptions = [],
  sortOptions = [],
  enableSelection = false,
  enableExport = false,
  enablePagination = true,
  pageSize = 10,
  onRowClick,
  onSelectionChange,
  actions,
  className = '',
  loading = false,
  emptyMessage = 'No data found'
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [sortBy, setSortBy] = useState<SortOption | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Process data with search, filters, and sorting
  const processedData = useMemo(() => {
    let result = [...data];

    // Apply search
    if (searchTerm && searchConfig) {
      result = filterBySearch(result, searchTerm, searchConfig.fields);
    }

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        result = result.filter(item => {
          const itemValue = item[key];
          if (typeof value === 'string') {
            return itemValue?.toString().toLowerCase().includes(value.toLowerCase());
          }
          return itemValue === value;
        });
      }
    });

    // Apply sorting
    if (sortBy) {
      result = sortByField(result, sortBy.key, sortBy.direction);
    }

    return result;
  }, [data, searchTerm, filters, sortBy, searchConfig]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!enablePagination) return { data: processedData, total: processedData.length, pages: 1 };
    return paginate(processedData, currentPage, pageSize);
  }, [processedData, currentPage, pageSize, enablePagination]);

  // Handle row selection
  const handleRowSelect = (rowId: string, checked: boolean) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(rowId);
    } else {
      newSelected.delete(rowId);
    }
    setSelectedRows(newSelected);

    if (onSelectionChange) {
      const selectedData = processedData.filter(row => newSelected.has(getRowId(row)));
      onSelectionChange(selectedData);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    const newSelected = new Set<string>();
    if (checked) {
      paginatedData.data.forEach(row => newSelected.add(getRowId(row)));
    }
    setSelectedRows(newSelected);

    if (onSelectionChange) {
      const selectedData = checked ? paginatedData.data : [];
      onSelectionChange(selectedData);
    }
  };

  // Get unique row identifier
  const getRowId = (row: T): string => {
    return row.id?.toString() || row._id?.toString() || JSON.stringify(row);
  };

  // Handle sorting
  const handleSort = (column: Column<T>) => {
    if (!column.sortable) return;

    const key = column.key as string;
    const currentDirection = sortBy?.key === key ? sortBy.direction : null;

    let newDirection: 'asc' | 'desc';
    if (currentDirection === 'asc') {
      newDirection = 'desc';
    } else if (currentDirection === 'desc') {
      setSortBy(null);
      return;
    } else {
      newDirection = 'asc';
    }

    setSortBy({ key, label: column.label, direction: newDirection });
  };

  // Render cell content
  const renderCell = (column: Column<T>, row: T) => {
    const value = row[column.key as keyof T];

    if (column.render) {
      return column.render(value, row);
    }

    switch (column.type) {
      case 'boolean':
        return value ? 'Yes' : 'No';
      case 'badge':
        return <Badge variant="outline">{value}</Badge>;
      case 'date':
        return value ? new Date(value).toLocaleDateString() : '-';
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : value;
      case 'actions':
        return actions?.(row);
      default:
        return value || '-';
    }
  };

  // Get sort icon
  const getSortIcon = (column: Column<T>) => {
    if (!column.sortable) return null;

    const key = column.key as string;
    if (sortBy?.key !== key) {
      return <ChevronsUpDown className="w-4 h-4 text-gray-400" />;
    }

    return sortBy.direction === 'asc'
      ? <ChevronUp className="w-4 h-4 text-blue-500" />
      : <ChevronDown className="w-4 h-4 text-blue-500" />;
  };

  // Export columns for export tools
  const exportColumns = columns
    .filter(col => col.type !== 'actions')
    .map(col => ({
      key: col.key as string,
      label: col.label,
      type: col.type as any,
      format: col.render ? (value: any) => String(value) : undefined
    }));

  // Handle export
  const handleExport = (format: 'csv' | 'json' | 'pdf') => {
    const filename = `data-export-${new Date().toISOString().split('T')[0]}`;
    exportToCSV(processedData, filename, exportColumns.map(col => col.label));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 max-w-md">
          {searchConfig && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder={searchConfig.placeholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {filterOptions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          )}

          {enableExport && (
            <ExportTools
              data={processedData}
              filename="data-export"
              columns={exportColumns}
              onExport={handleExport}
            />
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && filterOptions.length > 0 && (
        <AdvancedFilter
          searchConfig={searchConfig || { placeholder: '', fields: [] }}
          filterOptions={filterOptions}
          sortOptions={sortOptions}
          onSearch={setSearchTerm}
          onFilter={setFilters}
          onSort={setSortBy}
        />
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {enableSelection && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedRows.size === paginatedData.data.length && paginatedData.data.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead
                  key={column.key as string}
                  className={`${column.width ? `w-${column.width}` : ''} ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-50' : ''
                  } ${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'}`}
                  onClick={() => column.sortable && handleSort(column)}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {getSortIcon(column)}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (enableSelection ? 1 : 0)}
                  className="text-center py-8 text-gray-500"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.data.map((row, index) => (
                <TableRow
                  key={getRowId(row)}
                  className={onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
                  onClick={() => onRowClick?.(row)}
                >
                  {enableSelection && (
                    <TableCell>
                      <Checkbox
                        checked={selectedRows.has(getRowId(row))}
                        onCheckedChange={(checked) => handleRowSelect(getRowId(row), checked === true)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell
                      key={column.key as string}
                      className={`${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'}`}
                    >
                      {renderCell(column, row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {enablePagination && paginatedData.pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, processedData.length)} of {processedData.length} entries
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Previous
            </Button>
            <span className="px-3 py-1 text-sm">
              Page {currentPage} of {paginatedData.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === paginatedData.pages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Selection Summary */}
      {selectedRows.size > 0 && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
          {selectedRows.size} item{selectedRows.size > 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  );
}