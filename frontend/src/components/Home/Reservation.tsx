"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { apiClient } from '../../lib/api-client';
import { toast } from 'sonner';
import { useAuth } from '../../lib/auth-context';
import { useLanguage } from '../../lib/language';
import { LoginRequiredModal } from '../LoginRequiredModal';
import { Loader2 } from 'lucide-react';
import ResponsiveContainer from './ResponsiveContainer';

const Reservation = () => {
    const { user, isAuthenticated } = useAuth();
    const { t } = useLanguage();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        date: '',
        time: '',
        guests: '',
        specialRequests: ''
    });

    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [reservationId, setReservationId] = useState('');
    const [confirmationCountdown, setConfirmationCountdown] = useState(3);
    const [showLoginModal, setShowLoginModal] = useState(false);

    // Dynamic time slots
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    
    // Refs to track in-flight requests and prevent duplicates
    const fetchingSlotsRef = useRef(false);

    const guestOptions = Array.from({ length: 20 }, (_, i) => i + 1);

    const parseDateInput = useCallback((dateValue: string) => {
        const [year, month, day] = dateValue.split('-').map(Number);
        return new Date(year, month - 1, day);
    }, []);

    const getTodayLocalDate = useCallback(() => {
        const now = new Date();
        const offsetMs = now.getTimezoneOffset() * 60 * 1000;
        return new Date(now.getTime() - offsetMs).toISOString().split('T')[0];
    }, []);

    const isValidSpanishPhone = useCallback((phone: string) => {
        const normalizedPhone = phone.replace(/[\s-]/g, '');
        return /^(?:\+34|0034)?[6-9]\d{8}$/.test(normalizedPhone);
    }, []);

    // Pre-fill user data if authenticated
    useEffect(() => {
        if (isAuthenticated && user) {
            setFormData(prev => ({
                ...prev,
                name: user.name || '',
                email: user.email || '',
                phone: (user as any).phone || ''
            }));
        }
    }, [isAuthenticated, user]);

    // Auto-hide confirmation and return to a clean reservation form after 3 seconds
    useEffect(() => {
        if (!showConfirmation) return;

        setConfirmationCountdown(3);

        const countdownInterval = setInterval(() => {
            setConfirmationCountdown(prev => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        const hideTimer = setTimeout(() => {
            setShowConfirmation(false);
            setReservationId('');
            setErrors({});
            setAvailableSlots([]);
            setFormData({
                name: user?.name || '',
                email: user?.email || '',
                phone: (user as any)?.phone || '',
                date: '',
                time: '',
                guests: '',
                specialRequests: ''
            });
        }, 4000);

        return () => {
            clearInterval(countdownInterval);
            clearTimeout(hideTimer);
        };
    }, [showConfirmation, user]);

    // Convert 12-hour format time to 24-hour format
    const convertTo24Hour = useCallback((time24: string) => {
        if (!time24) return '';
        const [time, period] = time24.split(' ');
        if (!time || !period) return time24;
        
        let [hours, minutes] = time.split(':');
        if (!hours || !minutes) return time24;

        if (period === 'PM' && hours !== '12') {
            hours = String(parseInt(hours) + 12);
        } else if (period === 'AM' && hours === '12') {
            hours = '00';
        }

        return `${hours.padStart(2, '0')}:${minutes}`;
    }, []);

    // Generate time slots from 14:30 to 22:30
    const generateTimeSlots = useCallback(() => {
        const slots: string[] = [];
    
        for (let hour = 14; hour <= 22; hour++) {
            const time = `${hour}:30`;
            slots.push(time);
        }
    
        return slots;
    }, []);

    // Filter out past time slots if selected date is today
    const filterPastTimeSlots = useCallback((slots: string[]) => {
        if (!formData.date) return slots;
        
        const selectedDate = parseDateInput(formData.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDateOnly = new Date(selectedDate);
        selectedDateOnly.setHours(0, 0, 0, 0);
        
        // If selected date is not today, return all slots
        if (selectedDateOnly.getTime() !== today.getTime()) {
            return slots;
        }
        
        // Filter out past time slots for today
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        return slots.filter(slot => {
            const time24 = convertTo24Hour(slot);
            const [slotHour, slotMinute] = time24.split(':').map(Number);
            
            // Keep slot if it's at least 1 hour in the future
            const slotTotalMinutes = slotHour * 60 + slotMinute;
            const currentTotalMinutes = currentHour * 60 + currentMinute;
            
            return slotTotalMinutes > currentTotalMinutes + 60; // 1 hour buffer
        });
    }, [formData.date, convertTo24Hour, parseDateInput]);

    const fetchAvailableSlots = useCallback(async () => {
        if (fetchingSlotsRef.current) return;
        
        fetchingSlotsRef.current = true;
        setLoadingSlots(true);
        setFormData(prev => ({ ...prev, time: '' }));

        try {
            // Generate static time slots
            const allSlots = generateTimeSlots();
            
            // Filter out past times if today
            const filteredSlots = filterPastTimeSlots(allSlots);
            
            setAvailableSlots(filteredSlots);
        } catch (error: any) {
            console.error('Error generating time slots:', error);
            setAvailableSlots([]);
        } finally {
            setLoadingSlots(false);
            fetchingSlotsRef.current = false;
        }
    }, [formData.date, formData.guests, generateTimeSlots, filterPastTimeSlots]);

    // Fetch available time slots when date and guests are selected
    useEffect(() => {
        let isMounted = true;
        
        if (formData.date && formData.guests) {
            fetchAvailableSlots().catch(() => {});
        } else {
            if (isMounted) {
                setAvailableSlots([]);
            }
        }
        
        return () => {
            isMounted = false;
        };
    }, [formData.date, formData.guests, fetchAvailableSlots]);

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};

        if (!formData.name.trim()) {
            newErrors.name = t('Name is required');
        }

        if (!formData.email.trim()) {
            newErrors.email = t('Email is required');
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = t('Please enter a valid email address');
        }

        if (!formData.phone.trim()) {
            newErrors.phone = t('Phone number is required');
        } else if (!isValidSpanishPhone(formData.phone)) {
            newErrors.phone = t('Please enter a valid Spain phone number');
        }

        if (!formData.date) {
            newErrors.date = t('Please select a date');
        } else {
            const selectedDate = parseDateInput(formData.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (selectedDate < today) {
                newErrors.date = t('Please select a future date');
            }
        }

        if (!formData.time) {
            newErrors.time = t('Please select a time');
        }

        if (!formData.guests) {
            newErrors.guests = t('Please select number of guests');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        if (!isAuthenticated) {
            setShowLoginModal(true);
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await apiClient.createReservation({
                guestName: formData.name,
                guestEmail: formData.email,
                guestPhone: formData.phone,
                partySize: parseInt(formData.guests),
                reservationDate: formData.date,
                reservationTime: convertTo24Hour(formData.time),
                specialRequests: formData.specialRequests || undefined,
            });

            if (response.success) {
                setReservationId(response.data.reservation.id.toString());
                setShowConfirmation(true);
                toast.success('📝 Reservation Request Received. Your booking is currently Pending Confirmation by the Admin. You will receive an email shortly.');
            }
        } catch (error: any) {
            console.error('Reservation submission failed:', error);
            toast.error(error.response?.data?.error || 'Failed to create reservation. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (showConfirmation) {
        return (
            <section className="relative bg-[#111115] py-16">
                <ResponsiveContainer>
                    <div className="max-w-2xl mx-auto bg-[#18181c] rounded-lg border border-[#23232a] p-8 text-center">
                        <div className="w-20 h-20 mx-auto mb-6 bg-[#F0681D] rounded-full flex items-center justify-center">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                            {t('Reservation Request Received!')}
                        </h1>
                        <p className="text-[#bdbdbd] mb-6" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                            {t('Thank you for choosing The Saffron Lounge. Your reservation request is currently')} <span className="text-yellow-400 font-semibold">{t('Pending Confirmation')}</span> {t('by our admin team.')}
                        </p>
                        <div className="bg-[#111115] rounded-lg p-6 mb-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                                <div>
                                    <p className="text-[#666] text-md">{t('Reservation ID')}</p>
                                    <p className="text-white font-bold">{reservationId}</p>
                                </div>
                                <div>
                                    <p className="text-[#666] text-md">{t('Name')}</p>
                                    <p className="text-white">{formData.name}</p>
                                </div>
                                <div>
                                    <p className="text-[#666] text-md">{t('Date & Time')}</p>
                                    <p className="text-white">{formData.date} {t('at')} {formData.time}</p>
                                </div>
                                <div>
                                    <p className="text-[#666] text-md">{t('Guests')}</p>
                                    <p className="text-white">{formData.guests} {t('people')}</p>
                                </div>
                            </div>
                        </div>
                        <p className="text-sm text-[#bdbdbd]" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                            {t('Returning to reservation form in')} {confirmationCountdown}s...
                        </p>
                    </div>
                </ResponsiveContainer>
            </section>
        );
    }

    return (
        <section className="relative bg-[#111115] py-16">
            {/* Decorative Flowers */}
            <div className="absolute left-8 top-1/4 w-80 h-80 hidden lg:block pointer-events-none z-[1]">
                <Image
                    src="/assets-main/flower-svg.png"
                    alt="Decorative flower left"
                    width={320}
                    height={320}
                    className="object-contain w-full h-full opacity-30"
                />
            </div>
            <div className="absolute right-8 top-1/4 w-80 h-80 hidden lg:block pointer-events-none z-[1]">
                <Image
                    src="/assets-main/flower-svg.png"
                    alt="Decorative flower right"
                    width={320}
                    height={320}
                    className="object-contain w-full h-full opacity-30"
                />
            </div>

            <ResponsiveContainer>
                <div className="max-w-6xl mx-auto relative z-10">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                            {t('Reserve Your Table')}
                        </h2>
                        <p className="text-md text-[#bdbdbd] max-w-2xl mx-auto" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
                            {t('Book your table at The Saffron Lounge and enjoy an unforgettable culinary experience')}
                        </p>
                    </div>

                    <div className="bg-gradient-to-br from-[#18181c] to-[#1a1a1e] rounded-lg border border-[#23232a] p-2 md:p-12 shadow-2xl relative z-10 overflow-visible">
                        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Name */}
                                <div className="relative">
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className={`w-full pl-10 pr-4 py-3 bg-[#111115] border rounded-lg text-white placeholder:text-sm  focus:outline-none focus:ring-2 focus:ring-[#F0681D]/50 transition-all duration-300 ${errors.name ? 'border-red-500' : 'border-[#333] focus:border-[#F0681D]'
                                            }`}
                                        placeholder={t('Full Name *')}
                                        aria-describedby={errors.name ? "name-error" : undefined}
                                    />
                                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    {errors.name && (
                                        <p id="name-error" className="text-red-500 text-md mt-1">{errors.name}</p>
                                    )}
                                </div>

                                {/* Email */}
                                <div className="relative">
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className={`w-full pl-10 pr-4 py-3 bg-[#111115] border rounded-lg text-white placeholder:text-sm placeholder-[#bdbdbd] focus:outline-none focus:ring-2 focus:ring-[#F0681D]/50 transition-all duration-300 ${errors.email ? 'border-red-500' : 'border-[#333] focus:border-[#F0681D]'
                                            }`}
                                        placeholder={t('Email Address *')}
                                        aria-describedby={errors.email ? "email-error" : undefined}
                                    />
                                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    {errors.email && (
                                        <p id="email-error" className="text-red-500 text-md mt-1">{errors.email}</p>
                                    )}
                                </div>
                            </div>

                            {/* Phone */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

{/* Phone */}
<div className="relative">
  <input
    type="tel"
    id="phone"
    name="phone"
    value={formData.phone}
    onChange={handleInputChange}
    className={`w-full pl-10 pr-4 py-3 bg-[#111115] border rounded-lg text-white placeholder:text-sm placeholder-[#bdbdbd] focus:outline-none focus:ring-2 focus:ring-[#F0681D]/50 transition-all duration-300 ${
      errors.phone ? 'border-red-500' : 'border-[#333] focus:border-[#F0681D]'
    }`}
    placeholder={t('Phone Number *')}
  />

  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
  </svg>

  {errors.phone && (
    <p className="text-red-500 text-md mt-1">{errors.phone}</p>
  )}
</div>

{/* Date */}
<div className="relative">
  <input
    type="date"
    id="date"
    name="date"
    value={formData.date}
    onChange={handleInputChange}
        min={getTodayLocalDate()}
    className={`w-full pl-10 pr-4 py-3 bg-[#111115] border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#F0681D]/50 transition-all duration-300 ${
      errors.date ? 'border-red-500' : 'border-[#333] focus:border-[#F0681D]'
    }`}
    style={{ colorScheme: "dark" }}
  />

  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
  </svg>

  {errors.date && (
    <p className="text-red-500 text-md mt-1">{errors.date}</p>
  )}
</div>

</div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              

                                {/* Guests */}
                                <div className="relative z-20">
                                    <select
                                        id="guests"
                                        name="guests"
                                        value={formData.guests}
                                        onChange={handleInputChange}
                                        className={`w-full pl-4 pr-4 py-3 bg-[#111115] border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#F0681D]/50 transition-all duration-300 ${errors.guests ? 'border-red-500' : 'border-[#333] focus:border-[#F0681D]'
                                            }`}
                                        style={{ zIndex: 20 }}
                                        aria-describedby={errors.guests ? "guests-error" : undefined}
                                    >
                                        <option value="" className="text-sm text-[#bdbdbd]">{t('Select guests')}</option>
                                        {guestOptions.map(num => (
                                            <option key={num} value={num} className="bg-[#111115] text-sm text-[#bdbdbd]">{num} {num === 1 ? t('Guest') : t('Guests')}</option>
                                        ))}
                                    </select>
                                    {errors.guests && (
                                        <p id="guests-error" className="text-red-500 text-md mt-1 relative z-10">{errors.guests}</p>
                                    )}
                                </div>

                                {/* Time - Dynamic */}
                                <div className="relative">
                                    <div className="relative">
                                        <select
                                            id="time"
                                            name="time"
                                            value={formData.time}
                                            onChange={handleInputChange}
                                            disabled={loadingSlots || !formData.date || !formData.guests || availableSlots.length === 0}
                                            className={`w-full pl-10 pr-12 py-3 bg-[#111115] border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#F0681D]/50 transition-all duration-300 ${errors.time ? 'border-red-500' : 'border-[#333] focus:border-[#F0681D]'
                                                } ${loadingSlots || (!formData.date || !formData.guests) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            aria-describedby={errors.time ? "time-error" : undefined}
                                        >
                                            <option value="" className="text-sm text-[#bdbdbd]">
                                                {loadingSlots
                                                    ? t('Loading times...')
                                                    : !formData.date || !formData.guests
                                                        ? t('Please select date and guest first to view time slots')
                                                        : availableSlots.length === 0
                                                            ? t('No times available')
                                                            : t('Select time')}
                                            </option>
                                            {availableSlots.map((time: string) => (
                                                <option key={time} value={time} className="bg-[#111115] text-sm text-[#bdbdbd]">{time}</option>
                                            ))}
                                        </select>
                                        {loadingSlots ? (
                                            <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#F0681D] pointer-events-none animate-spin" />
                                        ) : (
                                            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        )}
                                    </div>
                                    {errors.time && (
                                        <p id="time-error" className="text-red-500 text-md mt-1">{errors.time}</p>
                                    )}
                                </div>
                            </div>

                            {/* Special Requests */}
                            <div className="relative">
                                <textarea
                                    id="specialRequests"
                                    name="specialRequests"
                                    value={formData.specialRequests}
                                    onChange={handleInputChange}
                                    rows={4}
                                    className="w-full pl-10 pr-4 py-3 bg-[#111115] border border-[#333] rounded-lg text-white placeholder:text-sm placeholder-[#bdbdbd] focus:outline-none focus:border-[#F0681D] focus:ring-2 focus:ring-[#F0681D]/50 transition-all duration-300 resize-none"
                                    placeholder={t('Special Requests or Dietary Notes')}
                                />
                                <svg className="absolute left-3 top-4 w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>

                            {/* Submit Button */}
                            <div className="text-center">
                                <button
                                    type="submit"
                                    disabled={isSubmitting || loadingSlots}
                                    className="px-8 py-4 bg-gradient-to-r from-[#F0681D] to-[#c95916] text-white font-bold rounded-lg hover:shadow-lg hover:shadow-[#F0681D]/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mx-auto gap-2 text-lg"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>{t('Reserving...')}</span>
                                        </>
                                    ) : (
                                        t('Reserve Table')
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </ResponsiveContainer>

            {/* Login Modal */}
            <LoginRequiredModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
                message={t('Please log in to make a reservation.')}
                returnUrl="/"
            />
        </section>
    );
};

export default Reservation;
