'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../../lib/api-client';
import { Button } from '../../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Calendar as CalendarUI } from '../../../../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../../../../components/ui/popover';
import { Label } from '../../../../components/ui/label';
import { Input } from '../../../../components/ui/input';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '../../../../components/ui/select';
import { toast } from 'sonner';
import {
  ArrowLeft, CalendarIcon, Users, Clock, Phone, Mail, User,
  Loader2, CheckCircle2, Wifi, PhoneCall, MapPin, ClipboardList,
} from 'lucide-react';
import Link from 'next/link';

type Source = 'WHATSAPP' | 'PHONE' | 'WALK_IN' | 'MANUAL';

interface FormData {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  partySize: string;
  reservationDate: string;   // YYYY-MM-DD
  reservationTime: string;
  source: Source;
  specialRequests: string;
}

const TIME_SLOTS = Array.from({ length: 9 }, (_, i) => `${14 + i}:30`);

const SOURCE_OPTIONS: {
  value: Source; label: string; description: string;
  icon: React.ReactNode; activeColor: string;
}[] = [
  { value: 'WHATSAPP', label: 'WhatsApp',     description: 'Booking via WhatsApp message', icon: <Wifi className="w-4 h-4" />,          activeColor: 'border-green-400 bg-green-50 text-green-700' },
  { value: 'PHONE',    label: 'Phone Call',   description: 'Booking via phone call',        icon: <PhoneCall className="w-4 h-4" />,     activeColor: 'border-blue-400 bg-blue-50 text-blue-700' },
  { value: 'WALK_IN',  label: 'Walk-in',      description: 'Guest walked in to book',       icon: <MapPin className="w-4 h-4" />,        activeColor: 'border-amber-400 bg-amber-50 text-amber-700' },
  { value: 'MANUAL',   label: 'Manual Entry', description: 'Other / manual by admin',       icon: <ClipboardList className="w-4 h-4" />, activeColor: 'border-purple-400 bg-purple-50 text-purple-700' },
];

// ─── Shared sub-components ────────────────────────────────────────────────────

/** Input with a left icon. Icon is absolutely positioned and pointer-events-none. */
function IconInput({
  icon,
  hasError,
  ...rest
}: { icon: React.ReactNode; hasError?: boolean } & React.ComponentProps<typeof Input>) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
        {icon}
      </span>
      <Input
        {...rest}
        className={[
          'h-10 pl-10',
          hasError ? 'border-red-400 focus-visible:ring-red-300' : '',
        ].filter(Boolean).join(' ')}
      />
    </div>
  );
}


/**
 * Select with a decorative left icon.
 * Icon lives in a wrapper div (NOT inside SelectTrigger) so Radix click routing is unaffected.
 * SelectTrigger gets pl-10 so text starts after the icon area.
 */
function IconSelect({
  icon,
  hasError,
  placeholder,
  value,
  onValueChange,
  disabled,
  children,
}: {
  icon: React.ReactNode;
  hasError?: boolean;
  placeholder: string;
  value: string;
  onValueChange: (v: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      {/* Icon is outside the trigger — pointer-events-none, purely decorative */}
      <span className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center text-gray-400">
        {icon}
      </span>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger
          className={[
            'h-10 w-full pl-10',
            hasError ? 'border-red-400 focus:ring-red-300' : '',
          ].filter(Boolean).join(' ')}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  );
}

/** Controlled date-picker button + popover calendar. Never opens from outside interaction. */
function DatePickerField({
  value,
  onChange,
  minDate,
  hasError,
}: {
  value: string;
  onChange: (v: string) => void;
  minDate: string;
  hasError?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const selected = value ? new Date(value + 'T12:00:00') : undefined;
  const displayLabel = value
    ? new Date(value + 'T12:00:00').toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
      })
    : 'Select date';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {/* type="button" prevents accidental form submission */}
        <button
          type="button"
          className={[
            'flex h-10 w-full items-center gap-3 rounded-md border bg-background px-3 text-sm',
            'transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-ring',
            value ? 'text-gray-900' : 'text-muted-foreground',
            hasError ? 'border-red-400' : 'border-input',
          ].join(' ')}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 text-gray-400" />
          <span className="flex-1 text-left">{displayLabel}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <CalendarUI
          mode="single"
          selected={selected}
          onSelect={(date) => {
            if (date) {
              const y = date.getFullYear();
              const m = String(date.getMonth() + 1).padStart(2, '0');
              const d = String(date.getDate()).padStart(2, '0');
              onChange(`${y}-${m}-${d}`);
            }
            setOpen(false);
          }}
          disabled={(date) => date < today}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-500">{msg}</p>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminCreateReservationPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<FormData>({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    partySize: '',
    reservationDate: '',
    reservationTime: '',
    source: 'MANUAL',
    specialRequests: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const fetchingRef = useRef(false);

  const getTodayLocalDate = useCallback(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
      .toISOString().split('T')[0];
  }, []);

  const filterPastSlots = useCallback((slots: string[]) => {
    if (!formData.reservationDate) return slots;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const selected = new Date(formData.reservationDate + 'T00:00:00');
    if (selected.getTime() !== today.getTime()) return slots;
    const now = new Date();
    return slots.filter(slot => {
      const [h, m] = slot.split(':').map(Number);
      return h * 60 + m > now.getHours() * 60 + now.getMinutes() + 60;
    });
  }, [formData.reservationDate]);

  useEffect(() => {
    if (!formData.reservationDate || !formData.partySize) {
      setAvailableSlots([]);
      setFormData(prev => ({ ...prev, reservationTime: '' }));
      return;
    }
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoadingSlots(true);
    setFormData(prev => ({ ...prev, reservationTime: '' }));
    setAvailableSlots(filterPastSlots(TIME_SLOTS));
    setLoadingSlots(false);
    fetchingRef.current = false;
  }, [formData.reservationDate, formData.partySize, filterPastSlots]);

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!formData.guestName.trim())  e.guestName = 'Guest name is required';
    if (!formData.guestEmail.trim()) e.guestEmail = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.guestEmail)) e.guestEmail = 'Enter a valid email address';
    if (!formData.guestPhone.trim()) e.guestPhone = 'Phone number is required';
    if (!formData.partySize)         e.partySize = 'Number of guests is required';
    if (!formData.reservationDate)   e.reservationDate = 'Date is required';
    else if (formData.reservationDate < getTodayLocalDate()) e.reservationDate = 'Date must be today or in the future';
    if (!formData.reservationTime)   e.reservationTime = 'Time is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient.adminCreateReservation({
        guestName:       formData.guestName.trim(),
        guestEmail:      formData.guestEmail.trim(),
        guestPhone:      formData.guestPhone.trim(),
        partySize:       parseInt(formData.partySize),
        reservationDate: formData.reservationDate,
        reservationTime: formData.reservationTime,
        source:          formData.source,
        specialRequests: formData.specialRequests.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast.success('Reservation created and confirmed successfully');
      router.push('/admin/reservations');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create reservation');
    },
  });

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) createMutation.mutate();
  };

  const selectedSource = SOURCE_OPTIONS.find(o => o.value === formData.source)!;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/admin/reservations">
          <Button variant="outline" size="sm" className="mt-1">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Create Reservation</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Manually create a reservation for walk-ins, phone calls, or WhatsApp bookings.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Main Form (2 / 3 cols) ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Guest Details */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-800">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100">
                    <User className="h-4 w-4 text-gray-600" />
                  </span>
                  Guest Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">

                {/* Name + Email */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="guestName" className="text-sm font-medium text-gray-700">
                      Full Name <span className="text-red-500">*</span>
                    </Label>
                    <IconInput
                      id="guestName"
                      icon={<User className="h-4 w-4" />}
                      placeholder="Guest full name"
                      value={formData.guestName}
                      onChange={e => handleChange('guestName', e.target.value)}
                      hasError={!!errors.guestName}
                    />
                    <FieldError msg={errors.guestName} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="guestEmail" className="text-sm font-medium text-gray-700">
                      Email Address <span className="text-red-500">*</span>
                    </Label>
                    <IconInput
                      id="guestEmail"
                      type="email"
                      icon={<Mail className="h-4 w-4" />}
                      placeholder="guest@example.com"
                      value={formData.guestEmail}
                      onChange={e => handleChange('guestEmail', e.target.value)}
                      hasError={!!errors.guestEmail}
                    />
                    <FieldError msg={errors.guestEmail} />
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-1.5 sm:max-w-sm">
                  <Label htmlFor="guestPhone" className="text-sm font-medium text-gray-700">
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <IconInput
                    id="guestPhone"
                    type="tel"
                    icon={<Phone className="h-4 w-4" />}
                    placeholder="+34 600 000 000"
                    value={formData.guestPhone}
                    onChange={e => handleChange('guestPhone', e.target.value)}
                    hasError={!!errors.guestPhone}
                  />
                  <FieldError msg={errors.guestPhone} />
                </div>
              </CardContent>
            </Card>

            {/* Reservation Details */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-800">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100">
                    <CalendarIcon className="h-4 w-4 text-gray-600" />
                  </span>
                  Reservation Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">

                {/* Date + Guests */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">
                      Date <span className="text-red-500">*</span>
                    </Label>
                    <DatePickerField
                      value={formData.reservationDate}
                      onChange={v => handleChange('reservationDate', v)}
                      minDate={getTodayLocalDate()}
                      hasError={!!errors.reservationDate}
                    />
                    <FieldError msg={errors.reservationDate} />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">
                      Number of Guests <span className="text-red-500">*</span>
                    </Label>
                    <IconSelect
                      icon={<Users className="h-4 w-4" />}
                      placeholder="Select guests"
                      value={formData.partySize}
                      onValueChange={v => handleChange('partySize', v)}
                      hasError={!!errors.partySize}
                    >
                      {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
                        <SelectItem key={n} value={String(n)}>
                          {n} {n === 1 ? 'Guest' : 'Guests'}
                        </SelectItem>
                      ))}
                    </IconSelect>
                    <FieldError msg={errors.partySize} />
                  </div>
                </div>

                {/* Time */}
                <div className="space-y-1.5 sm:max-w-sm">
                  <Label className="text-sm font-medium text-gray-700">
                    Time <span className="text-red-500">*</span>
                  </Label>
                  <IconSelect
                    icon={<Clock className="h-4 w-4" />}
                    placeholder={
                      loadingSlots                                          ? 'Loading slots…'
                      : !formData.reservationDate || !formData.partySize   ? 'Select date & guests first'
                      : availableSlots.length === 0                        ? 'No slots available'
                      : 'Select time'
                    }
                    value={formData.reservationTime}
                    onValueChange={v => handleChange('reservationTime', v)}
                    disabled={!formData.reservationDate || !formData.partySize || loadingSlots}
                    hasError={!!errors.reservationTime}
                  >
                    {availableSlots.map(slot => (
                      <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                    ))}
                  </IconSelect>
                  <FieldError msg={errors.reservationTime} />
                </div>

                {/* Special Requests */}
                <div className="space-y-1.5">
                  <Label htmlFor="specialRequests" className="text-sm font-medium text-gray-700">
                    Special Requests
                    <span className="ml-1 text-xs font-normal text-gray-400">(optional)</span>
                  </Label>
                  <textarea
                    id="specialRequests"
                    rows={3}
                    className="w-full resize-none rounded-md border border-input bg-background px-3 py-2.5 text-sm leading-5 placeholder:text-muted-foreground transition-shadow focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                    placeholder="Dietary requirements, special occasions, seating preferences…"
                    value={formData.specialRequests}
                    onChange={e => handleChange('specialRequests', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Sidebar (1 / 3 cols) ── */}
          <div className="space-y-5">

            {/* Booking Source */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base font-semibold text-gray-800">Booking Source</CardTitle>
                <p className="mt-0.5 text-xs text-gray-500">How did this booking come in?</p>
              </CardHeader>
              <CardContent className="space-y-2 pt-4">
                {SOURCE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleChange('source', opt.value)}
                    className={[
                      'flex w-full items-start gap-3 rounded-lg border-2 px-3 py-2.5 text-left transition-all',
                      formData.source === opt.value
                        ? opt.activeColor
                        : 'border-gray-200 bg-white hover:border-gray-300',
                    ].join(' ')}
                  >
                    <span className={`mt-0.5 shrink-0 ${formData.source === opt.value ? '' : 'text-gray-400'}`}>
                      {opt.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium leading-tight">{opt.label}</span>
                      <span className="mt-0.5 block text-xs text-gray-500">{opt.description}</span>
                    </span>
                    {formData.source === opt.value && (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    )}
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Summary */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base font-semibold text-gray-800">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 pt-4 text-sm">
                {(
                  [
                    ['Guest',  formData.guestName || '—'],
                    ['Date',   formData.reservationDate
                                ? new Date(formData.reservationDate + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                                : '—'],
                    ['Time',   formData.reservationTime || '—'],
                    ['Guests', formData.partySize
                                ? `${formData.partySize} ${parseInt(formData.partySize) === 1 ? 'guest' : 'guests'}`
                                : '—'],
                    ['Source', selectedSource.label],
                  ] as [string, string][]
                ).map(([label, val]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="shrink-0 text-gray-500">{label}</span>
                    <span className="max-w-[60%] truncate text-right font-medium text-gray-800">{val}</span>
                  </div>
                ))}

                <div className="flex items-center justify-between">
                  <span className="shrink-0 text-gray-500">Status</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                    <CheckCircle2 className="h-3 w-3" /> CONFIRMED
                  </span>
                </div>

                <div className="space-y-2 border-t pt-3">
                  <Button type="submit" className="h-10 w-full" disabled={createMutation.isPending}>
                    {createMutation.isPending
                      ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</>
                      : 'Create Reservation'}
                  </Button>
                  <Link href="/admin/reservations" className="block">
                    <Button variant="outline" className="h-10 w-full">Cancel</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
