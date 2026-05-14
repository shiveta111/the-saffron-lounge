'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Bell,
  Plus,
  Send,
  Mail,
  MessageSquare,
  Smartphone,
  Settings,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Trash2,
  Edit
} from 'lucide-react';
import { toast } from 'sonner';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  channels: string[];
  recipients: string[];
  status: 'draft' | 'sent' | 'scheduled';
  scheduledFor?: string;
  sentAt?: string;
  createdAt: string;
  createdBy: string;
  stats?: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
  };
}

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  orderUpdates: boolean;
  userRegistrations: boolean;
  systemAlerts: boolean;
  marketingEmails: boolean;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    orderUpdates: true,
    userRegistrations: true,
    systemAlerts: true,
    marketingEmails: false
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('notifications');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Form states
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    type: 'info',
    channels: ['email'],
    recipients: ['all_users'],
    scheduleSend: false,
    scheduledFor: ''
  });

  // Mock data
  const mockNotifications: Notification[] = [
    {
      id: '1',
      title: 'New Menu Items Available',
      message: 'Check out our latest menu additions including seasonal specials!',
      type: 'info',
      channels: ['email', 'push'],
      recipients: ['all_users'],
      status: 'sent',
      sentAt: '2025-01-08T10:00:00.000Z',
      createdAt: '2025-01-08T09:30:00.000Z',
      createdBy: 'John Admin',
      stats: {
        sent: 1247,
        delivered: 1205,
        opened: 456,
        clicked: 123
      }
    },
    {
      id: '2',
      title: 'System Maintenance Notice',
      message: 'Scheduled maintenance will occur tonight from 2-4 AM. Service may be temporarily unavailable.',
      type: 'warning',
      channels: ['email', 'sms'],
      recipients: ['admin_users'],
      status: 'scheduled',
      scheduledFor: '2025-01-09T14:00:00.000Z',
      createdAt: '2025-01-08T16:45:00.000Z',
      createdBy: 'System'
    },
    {
      id: '3',
      title: 'Welcome to Our Restaurant!',
      message: 'Thank you for registering. Enjoy 10% off your first order!',
      type: 'success',
      channels: ['email'],
      recipients: ['new_users'],
      status: 'draft',
      createdAt: '2025-01-08T12:20:00.000Z',
      createdBy: 'Sarah Seller'
    }
  ];

  const fetchNotifications = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      toast.error('Failed to load notifications');
    }
  };

  const fetchSettings = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      // Settings already initialized
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchNotifications(), fetchSettings()]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateNotification = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      const newNotification: Notification = {
        id: Math.floor(Math.random() * 10000) + '',
        title: notificationForm.title,
        message: notificationForm.message,
        type: notificationForm.type as any,
        channels: notificationForm.channels,
        recipients: notificationForm.recipients,
        status: notificationForm.scheduleSend ? 'scheduled' : 'draft',
        scheduledFor: notificationForm.scheduleSend ? notificationForm.scheduledFor : undefined,
        createdAt: new Date().toISOString(),
        createdBy: 'Current User'
      };

      setNotifications(prev => [newNotification, ...prev]);
      toast.success('Notification created successfully');
      setIsCreateDialogOpen(false);
      resetNotificationForm();
    } catch (error) {
      console.error('Failed to create notification:', error);
      toast.error('Failed to create notification');
    }
  };

  const handleSendNotification = async (notificationId: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));

      setNotifications(prev => prev.map(notification =>
        notification.id === notificationId
          ? {
              ...notification,
              status: 'sent',
              sentAt: new Date().toISOString(),
              stats: {
                sent: 1247,
                delivered: 1205,
                opened: 0,
                clicked: 0
              }
            }
          : notification
      ));

      toast.success('Notification sent successfully');
    } catch (error) {
      console.error('Failed to send notification:', error);
      toast.error('Failed to send notification');
    }
  };

  const handleUpdateSettings = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success('Settings updated successfully');
    } catch (error) {
      console.error('Failed to update settings:', error);
      toast.error('Failed to update settings');
    }
  };

  const resetNotificationForm = () => {
    setNotificationForm({
      title: '',
      message: '',
      type: 'info',
      channels: ['email'],
      recipients: ['all_users'],
      scheduleSend: false,
      scheduledFor: ''
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-100 text-green-800">Sent</Badge>;
      case 'scheduled':
        return <Badge className="bg-blue-100 text-blue-800">Scheduled</Badge>;
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Bell className="w-4 h-4 text-blue-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Notifications</h2>
          <p className="text-gray-600 mt-1">Send notifications and manage communication preferences</p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Notification
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Notification</DialogTitle>
            </DialogHeader>
            <NotificationForm
              formData={notificationForm}
              setFormData={setNotificationForm}
              onSubmit={handleCreateNotification}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="notifications" className="flex items-center">
            <Bell className="w-4 h-4 mr-2" />
            Notifications ({notifications.length})
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Notification</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Channels</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifications.map((notification) => (
                    <TableRow key={notification.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{notification.title}</div>
                          <div className="text-sm text-gray-500 line-clamp-2">
                            {notification.message}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getTypeIcon(notification.type)}
                          <Badge variant="outline">{notification.type}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {notification.channels.map((channel, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {channel}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(notification.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {notification.recipients.map((recipient, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {recipient.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {new Date(notification.createdAt).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          {notification.status === 'draft' && (
                            <Button
                              size="sm"
                              onClick={() => handleSendNotification(notification.id)}
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          )}
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Configure how and when you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Email Notifications</Label>
                    <div className="text-sm text-gray-500">Receive notifications via email</div>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) =>
                      setSettings({...settings, emailNotifications: checked})
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Push Notifications</Label>
                    <div className="text-sm text-gray-500">Receive browser push notifications</div>
                  </div>
                  <Switch
                    checked={settings.pushNotifications}
                    onCheckedChange={(checked) =>
                      setSettings({...settings, pushNotifications: checked})
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">SMS Notifications</Label>
                    <div className="text-sm text-gray-500">Receive notifications via SMS</div>
                  </div>
                  <Switch
                    checked={settings.smsNotifications}
                    onCheckedChange={(checked) =>
                      setSettings({...settings, smsNotifications: checked})
                    }
                  />
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="text-lg font-medium mb-4">Event Notifications</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Order Updates</Label>
                      <div className="text-sm text-gray-500">New orders and order status changes</div>
                    </div>
                    <Switch
                      checked={settings.orderUpdates}
                      onCheckedChange={(checked) =>
                        setSettings({...settings, orderUpdates: checked})
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>User Registrations</Label>
                      <div className="text-sm text-gray-500">New user registrations</div>
                    </div>
                    <Switch
                      checked={settings.userRegistrations}
                      onCheckedChange={(checked) =>
                        setSettings({...settings, userRegistrations: checked})
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>System Alerts</Label>
                      <div className="text-sm text-gray-500">System errors and maintenance notifications</div>
                    </div>
                    <Switch
                      checked={settings.systemAlerts}
                      onCheckedChange={(checked) =>
                        setSettings({...settings, systemAlerts: checked})
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Marketing Emails</Label>
                      <div className="text-sm text-gray-500">Promotional and marketing communications</div>
                    </div>
                    <Switch
                      checked={settings.marketingEmails}
                      onCheckedChange={(checked) =>
                        setSettings({...settings, marketingEmails: checked})
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleUpdateSettings}>
                  <Settings className="w-4 h-4 mr-2" />
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface NotificationFormProps {
  formData: any;
  setFormData: (data: any) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

function NotificationForm({ formData, setFormData, onSubmit, onCancel }: NotificationFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="notification-title">Title</Label>
        <Input
          id="notification-title"
          value={formData.title}
          onChange={(e) => setFormData({...formData, title: e.target.value})}
          placeholder="Enter notification title"
        />
      </div>

      <div>
        <Label htmlFor="notification-message">Message</Label>
        <Textarea
          id="notification-message"
          value={formData.message}
          onChange={(e) => setFormData({...formData, message: e.target.value})}
          placeholder="Enter notification message"
          rows={4}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Type</Label>
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData({...formData, type: value})}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Recipients</Label>
          <Select
            value={formData.recipients[0]}
            onValueChange={(value) => setFormData({...formData, recipients: [value]})}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_users">All Users</SelectItem>
              <SelectItem value="admin_users">Admin Users</SelectItem>
              <SelectItem value="seller_users">Seller Users</SelectItem>
              <SelectItem value="new_users">New Users</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Channels</Label>
        <div className="flex space-x-4 mt-2">
          {[
            { id: 'email', label: 'Email', icon: Mail },
            { id: 'push', label: 'Push', icon: Bell },
            { id: 'sms', label: 'SMS', icon: MessageSquare }
          ].map((channel) => (
            <label key={channel.id} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.channels.includes(channel.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setFormData({
                      ...formData,
                      channels: [...formData.channels, channel.id]
                    });
                  } else {
                    setFormData({
                      ...formData,
                      channels: formData.channels.filter((c: string) => c !== channel.id)
                    });
                  }
                }}
                className="rounded"
              />
              <channel.icon className="w-4 h-4" />
              <span className="text-sm">{channel.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="schedule-send"
          checked={formData.scheduleSend}
          onChange={(e) => setFormData({...formData, scheduleSend: e.target.checked})}
          className="rounded"
        />
        <Label htmlFor="schedule-send">Schedule for later</Label>
      </div>

      {formData.scheduleSend && (
        <div>
          <Label htmlFor="scheduled-for">Schedule Date & Time</Label>
          <Input
            id="scheduled-for"
            type="datetime-local"
            value={formData.scheduledFor}
            onChange={(e) => setFormData({...formData, scheduledFor: e.target.value})}
          />
        </div>
      )}

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSubmit}>
          <Send className="w-4 h-4 mr-2" />
          {formData.scheduleSend ? 'Schedule' : 'Send'} Notification
        </Button>
      </div>
    </div>
  );
}