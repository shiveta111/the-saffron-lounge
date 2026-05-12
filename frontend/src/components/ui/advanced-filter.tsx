'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Badge } from './badge';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Calendar } from './calendar';
import { Checkbox } from './checkbox';
import { Label } from './label';
import { Separator } from './separator';
import {
  Filter,
  Search,
  X,
  Calendar as CalendarIcon,
  Save,
  Trash2,
  Settings
} from 'lucide-react';
import { format } from 'date-fns';
import { FilterOption, SearchConfig, SortOption, debounce } from '../../lib/utils';

interface AdvancedFilterProps {
  searchConfig: SearchConfig;
  filterOptions: FilterOption[];
  sortOptions?: SortOption[];
  onSearch: (term: string) => void;
  onFilter: (filters: Record<string, any>) => void;
  onSort?: (sort: SortOption) => void;
  onExport?: (format: 'csv' | 'json' | 'pdf') => void;
  onSaveFilter?: (name: string, filters: Record<string, any>) => void;
  savedFilters?: Array<{ name: string; filters: Record<string, any> }>;
  onLoadFilter?: (filters: Record<string, any>) => void;
  onClearFilters?: () => void;
  className?: string;
}

export function AdvancedFilter({
  searchConfig,
  filterOptions,
  sortOptions = [],
  onSearch,
  onFilter,
  onSort,
  onExport,
  onSaveFilter,
  savedFilters = [],
  onLoadFilter,
  onClearFilters,
  className = ''
}: AdvancedFilterProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saveFilterName, setSaveFilterName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Debounced search
  const debouncedSearch = debounce((term: string) => {
    onSearch(term);
  }, 300);

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm]);

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    if (value === '' || value === null || value === undefined || (Array.isArray(value) && value.length === 0)) {
      delete newFilters[key];
    }
    setFilters(newFilters);
    onFilter(newFilters);

    // Update active filters
    const activeKeys = Object.keys(newFilters).filter(k => {
      const val = newFilters[k];
      return val !== '' && val !== null && val !== undefined && !(Array.isArray(val) && val.length === 0);
    });
    setActiveFilters(activeKeys);
  };

  const clearFilter = (key: string) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    setFilters(newFilters);
    onFilter(newFilters);
    setActiveFilters(activeFilters.filter(k => k !== key));
  };

  const clearAllFilters = () => {
    setFilters({});
    setActiveFilters([]);
    onFilter({});
    if (onClearFilters) onClearFilters();
  };

  const handleSort = (option: SortOption) => {
    setSortBy(option);
    if (onSort) onSort(option);
  };

  const saveCurrentFilter = () => {
    if (saveFilterName && Object.keys(filters).length > 0) {
      if (onSaveFilter) {
        onSaveFilter(saveFilterName, filters);
      }
      setSaveFilterName('');
      setShowSaveDialog(false);
    }
  };

  const loadSavedFilter = (filter: { name: string; filters: Record<string, any> }) => {
    setFilters(filter.filters);
    setActiveFilters(Object.keys(filter.filters));
    if (onLoadFilter) {
      onLoadFilter(filter.filters);
    }
  };

  const getFilterValue = (option: FilterOption) => {
    return filters[option.key];
  };

  const renderFilterInput = (option: FilterOption) => {
    const value = getFilterValue(option);

    switch (option.type) {
      case 'text':
        return (
          <Input
            placeholder={option.placeholder || `Filter by ${option.label}`}
            value={value || ''}
            onChange={(e) => handleFilterChange(option.key, e.target.value)}
            className="w-full"
          />
        );

      case 'select':
        return (
          <Select
            value={value || ''}
            onValueChange={(val) => handleFilterChange(option.key, val)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={`Select ${option.label}`} />
            </SelectTrigger>
            <SelectContent>
              {option.options?.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value ? format(new Date(value), 'PPP') : `Select ${option.label}`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={value ? new Date(value) : undefined}
                onSelect={(date) => handleFilterChange(option.key, date?.toISOString())}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );

      case 'number':
        return (
          <Input
            type="number"
            placeholder={option.placeholder || `Enter ${option.label}`}
            value={value || ''}
            onChange={(e) => handleFilterChange(option.key, e.target.value ? Number(e.target.value) : '')}
            className="w-full"
          />
        );

      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={option.key}
              checked={value || false}
              onCheckedChange={(checked) => handleFilterChange(option.key, checked)}
            />
            <Label htmlFor={option.key}>{option.label}</Label>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Advanced Filters & Search
          </CardTitle>
          <div className="flex items-center gap-2">
            {onExport && (
              <Select onValueChange={(value: 'csv' | 'json' | 'pdf') => onExport(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Export" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">Export CSV</SelectItem>
                  <SelectItem value="json">Export JSON</SelectItem>
                  <SelectItem value="pdf">Export PDF</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Settings className="w-4 h-4 mr-2" />
              {showAdvanced ? 'Hide' : 'Show'} Filters
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder={searchConfig.placeholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Active Filters */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-600 mr-2">Active filters:</span>
            {activeFilters.map(key => {
              const option = filterOptions.find(opt => opt.key === key);
              if (!option) return null;

              const value = filters[key];
              let displayValue = '';

              if (option.type === 'boolean') {
                displayValue = value ? 'Yes' : 'No';
              } else if (option.type === 'date' && value) {
                displayValue = format(new Date(value), 'MMM dd, yyyy');
              } else if (option.type === 'select') {
                const selectedOption = option.options?.find(opt => opt.value === value);
                displayValue = selectedOption?.label || value;
              } else {
                displayValue = String(value);
              }

              return (
                <Badge key={key} variant="secondary" className="flex items-center gap-1">
                  {option.label}: {displayValue}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-red-500"
                    onClick={() => clearFilter(key)}
                  />
                </Badge>
              );
            })}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-red-600 hover:text-red-700"
            >
              Clear All
            </Button>
          </div>
        )}

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="space-y-4">
            <Separator />

            {/* Filter Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filterOptions.map(option => (
                <div key={option.key} className="space-y-2">
                  <Label className="text-sm font-medium">{option.label}</Label>
                  {renderFilterInput(option)}
                </div>
              ))}
            </div>

            {/* Sort Options */}
            {sortOptions.length > 0 && (
              <div className="flex items-center gap-4">
                <Label className="text-sm font-medium">Sort by:</Label>
                <Select
                  value={sortBy ? `${sortBy.key}-${sortBy.direction}` : ''}
                  onValueChange={(value) => {
                    const [key, direction] = value.split('-');
                    const option = sortOptions.find(opt => opt.key === key);
                    if (option) {
                      handleSort({ ...option, direction: direction as 'asc' | 'desc' });
                    }
                  }}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select sorting" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map(option => (
                      <React.Fragment key={`${option.key}-${option.direction}`}>
                        <SelectItem value={`${option.key}-asc`}>
                          {option.label} (A-Z)
                        </SelectItem>
                        <SelectItem value={`${option.key}-desc`}>
                          {option.label} (Z-A)
                        </SelectItem>
                      </React.Fragment>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Saved Filters */}
            {(onSaveFilter || savedFilters.length > 0) && (
              <div className="flex items-center gap-4">
                {onSaveFilter && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSaveDialog(true)}
                    disabled={Object.keys(filters).length === 0}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Filter
                  </Button>
                )}

                {savedFilters.length > 0 && (
                  <Select onValueChange={(name) => {
                    const filter = savedFilters.find(f => f.name === name);
                    if (filter) loadSavedFilter(filter);
                  }}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Load saved filter" />
                    </SelectTrigger>
                    <SelectContent>
                      {savedFilters.map(filter => (
                        <SelectItem key={filter.name} value={filter.name}>
                          {filter.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>
        )}

        {/* Save Filter Dialog */}
        {showSaveDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Save Filter</h3>
              <Input
                placeholder="Enter filter name"
                value={saveFilterName}
                onChange={(e) => setSaveFilterName(e.target.value)}
                className="mb-4"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={saveCurrentFilter} disabled={!saveFilterName}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}