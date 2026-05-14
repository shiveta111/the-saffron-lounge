'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Badge } from '../../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Plus, Search, Edit, Trash2, Tag, RefreshCw, Eye, Upload, ToggleLeft, ToggleRight, Power } from 'lucide-react';
import { Switch } from '../../../components/ui/switch';
import { Label } from '../../../components/ui/label';
import { toast } from 'sonner';
import { PromotionForm } from '../../../components/admin/promotions/PromotionForm';
import { PromotionDetailModal } from '../../../components/admin/promotions/PromotionDetailModal';
import { format } from 'date-fns';

interface Promotion {
  id: number;
  name: string;
  code: string | null;
  type: string;
  discountType: string;
  discountValue: number;
  validFrom: string;
  validTo: string | null;
  isActive: boolean;
  applicableType: string;
  priority: number;
  usedCount: number;
  usageLimit: number | null;
  bannerImageUrl: string | null;
  _count?: {
    usages: number;
  };
}

export default function PromotionsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'expired' | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [promotionFormOpen, setPromotionFormOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const queryClient = useQueryClient();

  // Fetch promotions
  const { data: promotionsResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['promotions', statusFilter, typeFilter, searchTerm],
    queryFn: async () => {
      const params: any = {};
      if (statusFilter === 'active') params.status = 'active';
      else if (statusFilter === 'expired') params.status = 'expired';
      if (typeFilter !== 'all') params.type = typeFilter;
      if (searchTerm) {
        // Search will be handled client-side for now
      }
      
      const response = await apiClient.getPromotions(params);
      return response;
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.deletePromotion(id);
      return response;
    },
    onSuccess: () => {
      toast.success('Promotion deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete promotion');
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.togglePromotionActive(id);
      return response;
    },
    onSuccess: () => {
      toast.success('Promotion status updated');
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update promotion status');
    },
  });

  // Fetch promotion settings
  const { data: settingsResponse } = useQuery({
    queryKey: ['promotion-settings'],
    queryFn: async () => {
      const response = await apiClient.getPromotionSettings();
      return response;
    },
  });

  // Toggle promotions globally
  const toggleGlobalMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await apiClient.togglePromotionsGlobally(enabled);
      return response;
    },
    onSuccess: (data) => {
      toast.success(data.message || `Promotions ${data.data?.enabled ? 'enabled' : 'disabled'} globally`);
      queryClient.invalidateQueries({ queryKey: ['promotion-settings'] });
      queryClient.invalidateQueries({ queryKey: ['active-promotions'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to toggle promotions globally');
    },
  });

  const promotionsEnabled = settingsResponse?.data?.enabled !== false;

  const promotions: Promotion[] = (promotionsResponse?.data?.promotions || []).map((p: any) => ({
    ...p,
    name: p.name || p.code || 'Unnamed Promotion',
    type: p.type || p.discountType || 'PERCENTAGE',
    applicableType: p.applicableType || 'ALL_PRODUCTS',
    priority: p.priority ?? 0,
    usedCount: p.usedCount ?? 0,
    usageLimit: p.usageLimit ?? null,
    bannerImageUrl: p.bannerImageUrl || null,
  }));
  
  // Filter promotions by search term
  const filteredPromotions = promotions.filter((promo) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      promo.name.toLowerCase().includes(searchLower) ||
      (promo.code && promo.code.toLowerCase().includes(searchLower)) ||
      promo.type.toLowerCase().includes(searchLower)
    );
  });

  const handleEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setPromotionFormOpen(true);
  };

  const handleDelete = async (promotion: Promotion) => {
    if (confirm(`Are you sure you want to delete "${promotion.name}"?`)) {
      deleteMutation.mutate(promotion.id);
    }
  };

  const handleToggleActive = (promotion: Promotion) => {
    toggleActiveMutation.mutate(promotion.id);
  };

  const handleViewDetails = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    setDetailModalOpen(true);
  };

  const getStatusBadge = (promotion: Promotion) => {
    const now = new Date();
    const validFrom = new Date(promotion.validFrom);
    const validTo = promotion.validTo ? new Date(promotion.validTo) : null;

    if (!promotion.isActive) {
      return <Badge variant="secondary">Inactive</Badge>;
    }

    if (now < validFrom) {
      return <Badge variant="outline">Upcoming</Badge>;
    }

    if (validTo && now > validTo) {
      return <Badge variant="destructive">Expired</Badge>;
    }

    return <Badge variant="default">Active</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      PERCENTAGE: 'bg-blue-100 text-blue-800',
      FIXED: 'bg-green-100 text-green-800',
      BOGO: 'bg-purple-100 text-purple-800',
      PRODUCT_BASED: 'bg-orange-100 text-orange-800',
      CATEGORY_BASED: 'bg-yellow-100 text-yellow-800',
      HAPPY_HOURS: 'bg-pink-100 text-pink-800',
      FIRST_ORDER: 'bg-indigo-100 text-indigo-800',
    };
    return (
      <Badge className={colors[type] || 'bg-gray-100 text-gray-800'}>
        {type.replace(/_/g, ' ')}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Promotions Management</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage promotional offers and discounts
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Global Toggle */}
          <div className="flex items-center gap-2 bg-card border rounded-lg px-4 py-2">
            <Power className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="global-toggle" className="text-sm font-medium cursor-pointer">
              Enable Promotions
            </Label>
            <Switch
              id="global-toggle"
              checked={promotionsEnabled}
              onCheckedChange={(checked) => {
                toggleGlobalMutation.mutate(checked);
              }}
              disabled={toggleGlobalMutation.isPending}
            />
          </div>
          <Button onClick={() => {
            setEditingPromotion(null);
            setPromotionFormOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Create Promotion
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Promotions</CardTitle>
              <CardDescription>
                Manage all promotional offers and discounts
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search promotions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                <SelectItem value="FIXED">Fixed</SelectItem>
                <SelectItem value="BOGO">BOGO</SelectItem>
                <SelectItem value="HAPPY_HOURS">Happy Hours</SelectItem>
                <SelectItem value="FIRST_ORDER">First Order</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Promotions Table */}
          {isLoading ? (
            <div className="text-center py-8">Loading promotions...</div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              Failed to load promotions
            </div>
          ) : filteredPromotions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No promotions found
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Valid Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPromotions.map((promotion) => (
                    <TableRow key={promotion.id}>
                      <TableCell className="font-medium">{promotion.name}</TableCell>
                      <TableCell>
                        {promotion.code ? (
                          <Badge variant="outline">{promotion.code}</Badge>
                        ) : (
                          <span className="text-muted-foreground">No code</span>
                        )}
                      </TableCell>
                      <TableCell>{getTypeBadge(promotion.type)}</TableCell>
                      <TableCell>
                        {promotion.discountType === 'PERCENTAGE'
                          ? `${promotion.discountValue}%`
                          : `₹${promotion.discountValue}`}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{format(new Date(promotion.validFrom), 'MMM dd, yyyy')}</div>
                          {promotion.validTo && (
                            <div className="text-muted-foreground">
                              to {format(new Date(promotion.validTo), 'MMM dd, yyyy')}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(promotion)}</TableCell>
                      <TableCell>
                        {promotion.usedCount}
                        {promotion.usageLimit && ` / ${promotion.usageLimit}`}
                      </TableCell>
                      <TableCell>{promotion.priority}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(promotion)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(promotion)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(promotion)}
                          >
                            {promotion.isActive ? (
                              <ToggleRight className="h-4 w-4" />
                            ) : (
                              <ToggleLeft className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(promotion)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Promotion Form Modal */}
      {promotionFormOpen && (
        <PromotionForm
          promotion={editingPromotion}
          open={promotionFormOpen}
          onClose={() => {
            setPromotionFormOpen(false);
            setEditingPromotion(null);
          }}
          onSuccess={() => {
            setPromotionFormOpen(false);
            setEditingPromotion(null);
            queryClient.invalidateQueries({ queryKey: ['promotions'] });
          }}
        />
      )}

      {/* Promotion Detail Modal */}
      {detailModalOpen && selectedPromotion && (
        <PromotionDetailModal
          promotion={selectedPromotion}
          open={detailModalOpen}
          onClose={() => {
            setDetailModalOpen(false);
            setSelectedPromotion(null);
          }}
        />
      )}
    </div>
  );
}
