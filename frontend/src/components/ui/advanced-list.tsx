'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Badge } from './badge';
import { Checkbox } from './checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';
import {
  ChevronUp,
  ChevronDown,
  Search,
  Filter,
  MoreHorizontal,
  RefreshCw,
  Download,
  Eye,
  Edit,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './dropdown-menu';
import { useRealtime, RealtimeEvent } from '@/lib/realtime';

export interface Column<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
  width?: string;
}

export interface FilterOption {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number' | 'boolean';
  options?: { value: string; label: string }[];
}

export interface AdvancedListProps<T = any> {
  data: T[];
  columns: Column<T>[];
  filters?: FilterOption[];
  actions?: {
    label: string;
    icon?: React.ReactNode;
    onClick: (item: T) => void;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    show?: (item: T) => boolean;
  }[];
  bulkActions?: {
    label: string;
    icon?: React.ReactNode;
    onClick: (selectedItems: T[]) => void;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  }[];
  onCreate?: () => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onView?: (item: T) => void;
  realtimeEvents?: string[];
  onRealtimeEvent?: (event: RealtimeEvent) => void;
  loading?: boolean;
  emptyMessage?: string;
  searchPlaceholder?: string;
  enableSearch?: boolean;
  enableFilters?: boolean;
  enablePagination?: boolean;
  enableBulkActions?: boolean;
  enableExport?: boolean;
  pageSize?: number;
  className?: string;
}

export function AdvancedList<T extends { id: string | number }>({
  data,
  columns,
  filters = [],
  actions = [],
  bulkActions = [],
  onCreate,
  onEdit,
  onDelete,
  onView,
  realtimeEvents = [],
  onRealtimeEvent,
  loading = false,
  emptyMessage = 'No items found',
  searchPlaceholder = 'Search...',
  enableSearch = true,
  enableFilters = true,
  enablePagination = true,
  enableBulkActions = true,
  enableExport = true,
  pageSize = 10,
  className = ''
}: AdvancedListProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState<Set<string | number>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const { isConnected, subscribe } = useRealtime();

  // Subscribe to real-time events
  useEffect(() => {
    if (realtimeEvents.length > 0 && onRealtimeEvent) {
      const subscriptions = realtimeEvents.map(eventType =>
        subscribe(eventType, onRealtimeEvent)
      );

      return () => {
        subscriptions.forEach(unsubscribe => unsubscribe);
      };
    }
  }, [realtimeEvents, onRealtimeEvent, subscribe]);

  // Filter and sort data
  const processedData = useMemo(() => {
    let filtered = data;

    // Apply search
    if (searchTerm && enableSearch) {
      filtered = filtered.filter(item =>
        Object.values(item).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply filters
    if (enableFilters) {
      filtered = filtered.filter(item => {
        return Object.entries(activeFilters).every(([key, value]) => {
          if (!value || value === 'all') return true;
          const itemValue = (item as any)[key];
          return String(itemValue).toLowerCase().includes(String(value).toLowerCase());
        });
      });
    }

    // Apply sorting
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = (a as any)[sortColumn];
        const bValue = (b as any)[sortColumn];

        let comparison = 0;
        if (aValue < bValue) comparison = -1;
        if (aValue > bValue) comparison = 1;

        return sortDirection === 'desc' ? -comparison : comparison;
      });
    }

    return filtered;
  }, [data, searchTerm, activeFilters, sortColumn, sortDirection, enableSearch, enableFilters]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!enablePagination) return processedData;

    const startIndex = (currentPage - 1) * pageSize;
    return processedData.slice(startIndex, startIndex + pageSize);
  }, [processedData, currentPage, pageSize, enablePagination]);

  const totalPages = Math.ceil(processedData.length / pageSize);

  // Handle sorting
  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  // Handle filtering
  const handleFilterChange = (key: string, value: any) => {
    setActiveFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? '' : value
    }));
    setCurrentPage(1); // Reset to first page
  };

  // Handle selection
  const handleSelectItem = (itemId: string | number, checked: boolean) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(paginatedData.map(item => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  // Handle bulk actions
  const handleBulkAction = (action: typeof bulkActions[0]) => {
    const selectedData = data.filter(item => selectedItems.has(item.id));
    action.onClick(selectedData);
    setSelectedItems(new Set());
  };

  // Handle export
  const handleExport = () => {
    const csvContent = [
      columns.map(col => col.label).join(','),
      ...processedData.map(item =>
        columns.map(col => {
          const value = (item as any)[col.key];
          return typeof value === 'object' ? JSON.stringify(value) : String(value || '');
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'export.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const allSelected = paginatedData.length > 0 && paginatedData.every(item => selectedItems.has(item.id));
  const someSelected = paginatedData.some(item => selectedItems.has(item.id));

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {onCreate && (
            <Button onClick={onCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Create New
            </Button>
          )}
          {enableBulkActions && selectedItems.size > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {selectedItems.size} selected
              </span>
              {bulkActions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'outline'}
                  size="sm"
                  onClick={() => handleBulkAction(action)}
                >
                  {action.icon}
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {isConnected && (
            <Badge variant="outline" className="text-green-600 border-green-600">
              <div className="w-2 h-2 bg-green-600 rounded-full mr-2 animate-pulse" />
              Live
            </Badge>
          )}

          {enableExport && (
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      {(enableSearch || (enableFilters && showFilters)) && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          {enableSearch && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          )}

          {enableFilters && showFilters && filters.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filters.map((filter) => (
                <div key={filter.key}>
                  <label className="text-sm font-medium mb-1 block">
                    {filter.label}
                  </label>
                  {filter.type === 'select' && filter.options ? (
                    <Select
                      value={activeFilters[filter.key] || 'all'}
                      onValueChange={(value) => handleFilterChange(filter.key, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`All ${filter.label}`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All {filter.label}</SelectItem>
                        {filter.options.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      placeholder={`Filter ${filter.label}`}
                      value={activeFilters[filter.key] || ''}
                      onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {enableBulkActions && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={column.sortable ? 'cursor-pointer hover:bg-gray-50' : ''}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <div className="flex flex-col">
                        <ChevronUp
                          className={`w-3 h-3 ${
                            sortColumn === column.key && sortDirection === 'asc'
                              ? 'text-blue-600'
                              : 'text-gray-400'
                          }`}
                        />
                        <ChevronDown
                          className={`w-3 h-3 -mt-1 ${
                            sortColumn === column.key && sortDirection === 'desc'
                              ? 'text-blue-600'
                              : 'text-gray-400'
                          }`}
                        />
                      </div>
                    )}
                  </div>
                </TableHead>
              ))}
              {(actions.length > 0 || onEdit || onDelete || onView) && (
                <TableHead className="w-12">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (enableBulkActions ? 1 : 0) + (actions.length > 0 || onEdit || onDelete || onView ? 1 : 0)}
                  className="text-center py-8"
                >
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Loading...
                </TableCell>
              </TableRow>
            ) : paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (enableBulkActions ? 1 : 0) + (actions.length > 0 || onEdit || onDelete || onView ? 1 : 0)}
                  className="text-center py-8 text-gray-500"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item) => (
                <TableRow key={item.id}>
                  {enableBulkActions && (
                    <TableCell>
                      <Checkbox
                        checked={selectedItems.has(item.id)}
                        onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                      />
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      {column.render
                        ? column.render((item as any)[column.key], item)
                        : String((item as any)[column.key] || '')
                      }
                    </TableCell>
                  ))}
                  {(actions.length > 0 || onEdit || onDelete || onView) && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onView && (
                            <DropdownMenuItem onClick={() => onView(item)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </DropdownMenuItem>
                          )}
                          {onEdit && (
                            <DropdownMenuItem onClick={() => onEdit(item)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {actions.map((action, index) => (
                            (!action.show || action.show(item)) && (
                              <DropdownMenuItem
                                key={index}
                                onClick={() => action.onClick(item)}
                                className={action.variant === 'destructive' ? 'text-red-600' : ''}
                              >
                                {action.icon}
                                {action.label}
                              </DropdownMenuItem>
                            )
                          ))}
                          {onDelete && (
                            <DropdownMenuItem
                              onClick={() => onDelete(item)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {enablePagination && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, processedData.length)} of {processedData.length} results
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}