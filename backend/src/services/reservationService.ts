import * as winston from 'winston';
import prisma from '../config/prisma';
import { sendEmail } from '../utils/email';
import { whatsappService } from './whatsappService';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'reservation-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/reservation-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/reservation.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

class ReservationService {
  /**
   * Get available time slots for a specific date and party size
   * @param date - Reservation date
   * @param partySize - Number of guests
   * @returns Array of available time slots with table information
   */
  async getAvailableSlots(date: Date, partySize: number): Promise<any[]> {
    try {
      // Use specific time slots matching the database timeslot structure
      // These match the slots defined in startupChecker.ts and seed files
      const timeSlots = ['11:00', '12:00', '13:00', '14:00', '18:00', '19:00', '20:00', '21:00'];
      const availableSlots: any[] = [];

      for (const time of timeSlots) {
        // Use total capacity approach for larger groups - allows combining multiple tables
        const slotAvailability = await this.checkSlotAvailability(date, time, partySize);

        const capacityConfigured = slotAvailability.totalCapacity > 0;
        const hasCapacityForParty = slotAvailability.availableCapacity >= partySize;

        if (slotAvailability.available && (!capacityConfigured || hasCapacityForParty)) {
          // Get available tables for display purposes
          const availableTables = await this.checkTableAvailability(date, time, partySize);
          
          // For large groups, calculate how many tables would be needed
          // If no single table is large enough, we can combine multiple tables
          let tablesNeeded = 1;
          if (availableTables.length === 0) {
            // No single table large enough, but total capacity is sufficient
            // Calculate minimum tables needed (assuming average table capacity of 4-6)
            const avgTableCapacity = 5;
            tablesNeeded = Math.ceil(partySize / avgTableCapacity);
          } else {
            // At least one table is large enough
            tablesNeeded = availableTables.length;
          }

          availableSlots.push({
            time,
            availableTables: tablesNeeded,
            totalCapacity: slotAvailability.totalCapacity,
            availableCapacity: slotAvailability.availableCapacity,
          });
        }
      }

      logger.info('Available slots retrieved', {
        date,
        partySize,
        slotsFound: availableSlots.length,
      });

      return availableSlots;
    } catch (error) {
      logger.error('Failed to get available slots', { error, date, partySize });
      throw new Error(`Failed to get available slots: ${(error as Error).message}`);
    }
  }

  /**
   * Check slot availability based on total seating capacity
   * @param date - Reservation date
   * @param time - Reservation time
   * @param requestedGuests - Number of guests for the new reservation
   * @returns Object with availability status and details
   */
  async checkSlotAvailability(date: Date, time: string, requestedGuests: number): Promise<{
    available: boolean;
    totalCapacity: number;
    bookedGuests: number;
    availableCapacity: number;
    message: string;
  }> {
    try {
      // Normalize date to start of day for comparison
      const reservationDate = new Date(date);
      reservationDate.setHours(0, 0, 0, 0);

      // Parse reservation time to minutes since midnight
      const reservationTimeMinutes = this.parseTime(time);
      const reservationDurationMinutes = 90; // 1.5 hours
      const reservationEndMinutes = reservationTimeMinutes + reservationDurationMinutes;

      // Get total seating capacity (sum of all active table capacities)
      const totalCapacityResult = await (prisma as any).table.aggregate({
        where: {
          isActive: true,
        },
        _sum: {
          capacity: true,
        },
      });

      const totalCapacity = totalCapacityResult._sum.capacity || 0;

      // If table capacity is not configured yet, do not block customer reservations.
      // This keeps the system operational in environments where tables are managed later via admin.
      if (totalCapacity <= 0) {
        logger.warn('No active table capacity configured; allowing reservation without capacity enforcement', {
          date: reservationDate.toISOString(),
          time,
          requestedGuests,
        });

        return {
          available: true,
          totalCapacity: 0,
          bookedGuests: 0,
          availableCapacity: 0,
          message: 'Capacity not configured. Reservation can be created as pending.',
        };
      }

      // Get sum of guests already booked for this time slot
      // Check reservations that overlap with the requested time
      const existingReservations = await (prisma as any).reservation.findMany({
        where: {
          reservationDate: reservationDate,
          status: {
            in: ['PENDING', 'CONFIRMED', 'SEATED'], // Only active reservations count
          },
        },
        select: {
          reservationTime: true,
          partySize: true,
        },
      });

      // Calculate booked guests for overlapping time slots
      let bookedGuests = 0;
      existingReservations.forEach((reservation: any) => {
        const existingTimeMinutes = this.parseTime(reservation.reservationTime);
        const existingEndMinutes = existingTimeMinutes + reservationDurationMinutes;

        // Check for time overlap
        const hasOverlap = (
          (reservationTimeMinutes >= existingTimeMinutes && reservationTimeMinutes < existingEndMinutes) ||
          (reservationEndMinutes > existingTimeMinutes && reservationEndMinutes <= existingEndMinutes) ||
          (reservationTimeMinutes <= existingTimeMinutes && reservationEndMinutes >= existingEndMinutes)
        );

        if (hasOverlap) {
          bookedGuests += reservation.partySize;
        }
      });

      const availableCapacity = totalCapacity - bookedGuests;
      const available = availableCapacity >= requestedGuests;

      logger.info('Slot availability checked', {
        date: reservationDate.toISOString(),
        time,
        requestedGuests,
        totalCapacity,
        bookedGuests,
        availableCapacity,
        available,
      });

      return {
        available,
        totalCapacity,
        bookedGuests,
        availableCapacity,
        message: available
          ? `Time slot available. ${availableCapacity} seats remaining.`
          : `Sorry, this time slot is fully booked. Only ${availableCapacity} seats available, but ${requestedGuests} requested.`,
      };
    } catch (error) {
      logger.error('Failed to check slot availability', { error, date, time, requestedGuests });
      throw new Error(`Failed to check slot availability: ${(error as Error).message}`);
    }
  }

  /**
   * Check table availability for a specific date, time, and party size
   * @param date - Reservation date
   * @param time - Reservation time
   * @param partySize - Number of guests
   * @returns Array of available tables
   */
  async checkTableAvailability(date: Date, time: string, partySize: number): Promise<any[]> {
    try {
      // Normalize date to start of day for comparison
      const reservationDate = new Date(date);
      reservationDate.setHours(0, 0, 0, 0);

      // Parse reservation time to minutes since midnight
      const reservationTimeMinutes = this.parseTime(time);
      
      // Reservation duration in minutes (default 1.5 hours = 90 minutes)
      const reservationDurationMinutes = 90;
      const reservationEndMinutes = reservationTimeMinutes + reservationDurationMinutes;

      // Get all active tables with sufficient capacity
      const allTables = await (prisma as any).table.findMany({
        where: {
          isActive: true,
          capacity: { gte: partySize },
        },
        select: {
          id: true,
          tableNumber: true,
          capacity: true,
          location: true,
        },
      });

      // Get all existing reservations for this date that could conflict
      const existingReservations = await (prisma as any).reservation.findMany({
        where: {
          reservationDate: reservationDate,
          status: {
            in: ['PENDING', 'CONFIRMED', 'SEATED'], // Only active reservations block tables
          },
          tableId: { not: null },
        },
        select: {
          tableId: true,
          reservationTime: true,
        },
      });

      // Filter out tables that have conflicting reservations
      const availableTables = allTables.filter((table: any) => {
        // Find reservations for this table
        const tableReservations = existingReservations.filter(
          (r: any) => r.tableId === table.id
        );

        // Check if any reservation conflicts with the requested time
        const hasConflict = tableReservations.some((reservation: any) => {
          const existingTimeMinutes = this.parseTime(reservation.reservationTime);
          const existingEndMinutes = existingTimeMinutes + reservationDurationMinutes;

          // Check for time overlap
          // Conflict if: requested start is within existing reservation OR
          //              requested end is within existing reservation OR
          //              requested reservation completely contains existing reservation
          return (
            (reservationTimeMinutes >= existingTimeMinutes && reservationTimeMinutes < existingEndMinutes) ||
            (reservationEndMinutes > existingTimeMinutes && reservationEndMinutes <= existingEndMinutes) ||
            (reservationTimeMinutes <= existingTimeMinutes && reservationEndMinutes >= existingEndMinutes)
          );
        });

        return !hasConflict;
      });

      logger.info('Table availability checked', {
        date: reservationDate.toISOString(),
        time,
        partySize,
        totalTables: allTables.length,
        availableTables: availableTables.length,
      });

      return availableTables.map((table: any) => ({
        tableId: table.id,
        tableNumber: table.tableNumber,
        capacity: table.capacity,
        location: table.location,
      }));
    } catch (error) {
      logger.error('Failed to check table availability', { error, date, time, partySize });
      throw new Error(`Failed to check table availability: ${(error as Error).message}`);
    }
  }

  /**
   * Create a reservation atomically with slot availability check based on total capacity
   * This prevents race conditions by checking availability and creating reservation in a single transaction
   * @param reservationData - Reservation data
   * @param tableId - Optional table ID to assign
   * @returns Created reservation
   */
  async createReservationAtomically(
    reservationData: {
      userId: number;
      guestName: string;
      guestEmail: string;
      guestPhone: string;
      partySize: number;
      reservationDate: Date;
      reservationTime: string;
      specialRequests?: string;
    },
    tableId?: number
  ): Promise<any> {
    try {
      // Check slot availability first (before transaction)
      const slotAvailability = await this.checkSlotAvailability(
        reservationData.reservationDate,
        reservationData.reservationTime,
        reservationData.partySize
      );

      if (!slotAvailability.available) {
        throw new Error(`Sorry, this time slot is fully booked. Only ${slotAvailability.availableCapacity} seats available, but ${reservationData.partySize} requested.`);
      }

      // Use Prisma transaction to ensure atomicity
      const reservation = await (prisma as any).$transaction(async (tx: any) => {
        // Re-check availability within transaction to prevent race conditions
        // Get total capacity
        const totalCapacityResult = await tx.table.aggregate({
          where: { isActive: true },
          _sum: { capacity: true },
        });
        const totalCapacity = totalCapacityResult._sum.capacity || 0;

        // Get sum of guests already booked for this time slot within transaction
        const reservationDate = new Date(reservationData.reservationDate);
        reservationDate.setHours(0, 0, 0, 0);
        const reservationTimeMinutes = this.parseTime(reservationData.reservationTime);
        const reservationDurationMinutes = 90;
        const reservationEndMinutes = reservationTimeMinutes + reservationDurationMinutes;

        // Prevent duplicate active reservation in the same slot for the same user.
        const existingUserReservation = await tx.reservation.findFirst({
          where: {
            userId: reservationData.userId,
            reservationDate: reservationDate,
            reservationTime: reservationData.reservationTime,
            status: { in: ['PENDING', 'CONFIRMED', 'SEATED'] },
          },
          select: {
            id: true,
          },
        });

        if (existingUserReservation) {
          throw new Error('You already have a reservation for this time slot.');
        }

        const existingReservations = await tx.reservation.findMany({
          where: {
            reservationDate: reservationDate,
            status: { in: ['PENDING', 'CONFIRMED', 'SEATED'] },
          },
          select: {
            reservationTime: true,
            partySize: true,
          },
        });

        let bookedGuests = 0;
        existingReservations.forEach((reservation: any) => {
          const existingTimeMinutes = this.parseTime(reservation.reservationTime);
          const existingEndMinutes = existingTimeMinutes + reservationDurationMinutes;
          const hasOverlap = (
            (reservationTimeMinutes >= existingTimeMinutes && reservationTimeMinutes < existingEndMinutes) ||
            (reservationEndMinutes > existingTimeMinutes && reservationEndMinutes <= existingEndMinutes) ||
            (reservationTimeMinutes <= existingTimeMinutes && reservationEndMinutes >= existingEndMinutes)
          );
          if (hasOverlap) {
            bookedGuests += reservation.partySize;
          }
        });

        const availableCapacity = totalCapacity - bookedGuests;
        const capacityEnforced = totalCapacity > 0;

        if (capacityEnforced && availableCapacity < reservationData.partySize) {
          throw new Error(`Sorry, this time slot is fully booked. Only ${availableCapacity} seats available, but ${reservationData.partySize} requested.`);
        }

        // If tableId is provided, also check table-specific availability
        if (tableId) {
          const availableTables = await this.checkTableAvailability(
            reservationData.reservationDate,
            reservationData.reservationTime,
            reservationData.partySize
          );

          const isTableAvailable = availableTables.some((t: any) => t.tableId === tableId);

          if (!isTableAvailable) {
            throw new Error(`Table ${tableId} is not available for this time slot`);
          }
        }

        // Create reservation within transaction - always PENDING initially
        const createdReservation = await tx.reservation.create({
          data: {
            userId: reservationData.userId,
            guestName: reservationData.guestName,
            guestEmail: reservationData.guestEmail,
            guestPhone: reservationData.guestPhone,
            partySize: reservationData.partySize,
            reservationDate: reservationData.reservationDate,
            reservationTime: reservationData.reservationTime,
            tableId: tableId || null,
            specialRequests: reservationData.specialRequests || null,
            status: 'PENDING', // Always start as PENDING - admin must confirm
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            table: {
              select: {
                id: true,
                tableNumber: true,
                capacity: true,
                location: true,
              },
            },
          },
        });

        return createdReservation;
      });

      logger.info('Reservation created atomically', {
        reservationId: reservation.id,
        userId: reservationData.userId,
        tableId,
        status: reservation.status,
      });

      return reservation;
    } catch (error) {
      logger.error('Failed to create reservation atomically', {
        error,
        reservationData,
        tableId,
      });
      throw error;
    }
  }

  /**
   * Assign a table to a reservation
   * @param reservationId - Reservation ID
   * @param tableId - Table ID to assign
   * @returns Updated reservation
   */
  async assignTable(reservationId: number, tableId: number): Promise<any> {
    try {
      // Get reservation details
      const reservation = await (prisma as any).reservation.findUnique({
        where: { id: reservationId },
      });

      if (!reservation) {
        throw new Error('Reservation not found');
      }

      // Check if table is available
      const availableTables = await this.checkTableAvailability(
        reservation.reservationDate,
        reservation.reservationTime,
        reservation.partySize
      );

      const isTableAvailable = availableTables.some((t: any) => t.tableId === tableId);

      if (!isTableAvailable) {
        throw new Error('Table is not available for this time slot');
      }

      // Assign table
      const updatedReservation = await (prisma as any).reservation.update({
        where: { id: reservationId },
        data: {
          tableId,
          status: 'CONFIRMED',
        },
        include: {
          table: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      logger.info('Table assigned to reservation', {
        reservationId,
        tableId,
      });

      // Send confirmation email
      await this.sendConfirmation(updatedReservation);

      return updatedReservation;
    } catch (error) {
      logger.error('Failed to assign table', { error, reservationId, tableId });
      throw new Error(`Failed to assign table: ${(error as Error).message}`);
    }
  }

  /**
   * Send reservation confirmation email
   * @param reservation - Reservation object with user and table details
   */
  async sendConfirmation(reservation: any): Promise<void> {
    try {
      const { guestEmail, guestName, reservationDate, reservationTime, partySize, table } =
        reservation;

      const formattedDate = new Date(reservationDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const emailSubject = 'Reservation Confirmation - The Saffron Lounge';
      const emailBody = `
        <h2>Reservation Confirmed</h2>
        <p>Dear ${guestName},</p>
        <p>Your reservation at The Saffron Lounge has been confirmed!</p>
        
        <h3>Reservation Details:</h3>
        <ul>
          <li><strong>Date:</strong> ${formattedDate}</li>
          <li><strong>Time:</strong> ${reservationTime}</li>
          <li><strong>Party Size:</strong> ${partySize} guests</li>
          ${table ? `<li><strong>Table:</strong> ${table.tableNumber}</li>` : ''}
          ${table?.location ? `<li><strong>Location:</strong> ${table.location}</li>` : ''}
        </ul>
        
        <p>We look forward to serving you!</p>
        
        <p>If you need to modify or cancel your reservation, please contact us at least 24 hours in advance.</p>
        
        <p>Best regards,<br>The Saffron Lounge Team</p>
      `;

      await sendEmail(guestEmail, emailSubject, emailBody);

      logger.info('Confirmation email sent', {
        reservationId: reservation.id,
        email: guestEmail,
      });
    } catch (error) {
      logger.error('Failed to send confirmation email', {
        error,
        reservationId: reservation.id,
      });
      // Don't throw error - email failure shouldn't break reservation
    }
  }

  /**
   * Send email with alternative time slots when requested slot is unavailable
   * @param guestEmail - Guest email address
   * @param guestName - Guest name
   * @param requestedDate - Requested reservation date
   * @param requestedTime - Requested reservation time
   * @param partySize - Number of guests
   * @param alternativeSlots - Array of alternative available time slots
   */
  async sendAlternativeSlotsEmail(
    guestEmail: string,
    guestName: string,
    requestedDate: Date,
    requestedTime: string,
    partySize: number,
    alternativeSlots: any[]
  ): Promise<void> {
    try {
      const formattedDate = new Date(requestedDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const emailSubject = 'Alternative Time Slots Available - The Saffron Lounge';
      const slotsList = alternativeSlots
        .slice(0, 5) // Show up to 5 alternative slots
        .map((slot) => `<li><strong>${slot.time}</strong> - ${slot.availableTables} table(s) available</li>`)
        .join('');

      const emailBody = `
        <h2>Alternative Time Slots Available</h2>
        <p>Dear ${guestName},</p>
        <p>Thank you for your interest in making a reservation at The Saffron Lounge!</p>
        
        <p>Unfortunately, the time slot you requested (<strong>${formattedDate} at ${requestedTime}</strong>) is not available for ${partySize} guest(s).</p>
        
        <h3>Available Alternative Time Slots:</h3>
        <ul>
          ${slotsList || '<li>Please contact us for availability</li>'}
        </ul>
        
        <p>We would be happy to accommodate you at one of these alternative times. Please reply to this email or call us to confirm your preferred time slot.</p>
        
        <p>We look forward to serving you!</p>
        
        <p>Best regards,<br>The Saffron Lounge Team</p>
      `;

      await sendEmail(guestEmail, emailSubject, emailBody);

      logger.info('Alternative slots email sent', {
        email: guestEmail,
        requestedDate,
        requestedTime,
        alternativeSlotsCount: alternativeSlots.length,
      });
    } catch (error) {
      logger.error('Failed to send alternative slots email', {
        error,
        email: guestEmail,
      });
      // Don't throw error - email failure shouldn't break reservation flow
    }
  }

  /**
   * Send reservation cancellation email
   * @param reservation - Reservation object
   */
  async sendCancellationEmail(reservation: any): Promise<void> {
    try {
      const { guestEmail, guestName, reservationDate, reservationTime } = reservation;

      const formattedDate = new Date(reservationDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const emailSubject = 'Reservation Cancelled - The Saffron Lounge';
      const emailBody = `
        <h2>Reservation Cancelled</h2>
        <p>Dear ${guestName},</p>
        <p>Your reservation at The Saffron Lounge has been cancelled.</p>
        
        <h3>Cancelled Reservation Details:</h3>
        <ul>
          <li><strong>Date:</strong> ${formattedDate}</li>
          <li><strong>Time:</strong> ${reservationTime}</li>
        </ul>
        
        <p>We hope to see you again soon!</p>
        
        <p>Best regards,<br>The Saffron Lounge Team</p>
      `;

      await sendEmail(guestEmail, emailSubject, emailBody);

      logger.info('Cancellation email sent', {
        reservationId: reservation.id,
        email: guestEmail,
      });

      // Send WhatsApp cancellation if phone number is available
      if (reservation.guestPhone) {
        const message = `❌ Reservation Cancelled - The Saffron Lounge

Dear ${guestName},

Your reservation for ${formattedDate} at ${reservationTime} has been cancelled.

We hope to see you again soon!

The Saffron Lounge`;

        await whatsappService.sendMessage(reservation.guestPhone, message);
      }
    } catch (error) {
      logger.error('Failed to send cancellation email', {
        error,
        reservationId: reservation.id,
      });
    }
  }

  /**
   * Parse time string to minutes since midnight
   * @param time - Time in HH:MM format
   * @returns Minutes since midnight
   */
  private parseTime(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  }

  /**
   * Generate time slots between start and end time
   * @param startTime - Start time (HH:MM)
   * @param endTime - End time (HH:MM)
   * @param intervalMinutes - Interval in minutes
   * @returns Array of time strings
   */
  private generateTimeSlots(
    startTime: string,
    endTime: string,
    intervalMinutes: number
  ): string[] {
    const slots: string[] = [];
    let currentMinutes = this.parseTime(startTime);
    const endMinutes = this.parseTime(endTime);

    while (currentMinutes <= endMinutes) {
      const hours = Math.floor(currentMinutes / 60);
      const minutes = currentMinutes % 60;
      slots.push(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
      currentMinutes += intervalMinutes;
    }

    return slots;
  }

  /**
   * Check if a reservation can be modified
   * @param reservationId - Reservation ID
   * @returns Boolean indicating if modification is allowed
   */
  async canModifyReservation(reservationId: number): Promise<boolean> {
    try {
      const reservation = await (prisma as any).reservation.findUnique({
        where: { id: reservationId },
      });

      if (!reservation) {
        return false;
      }

      // Can't modify completed or cancelled reservations
      if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(reservation.status)) {
        return false;
      }

      // Can't modify reservations less than 2 hours before the time
      const reservationDateTime = new Date(reservation.reservationDate);
      const [hours, minutes] = reservation.reservationTime.split(':').map(Number);
      reservationDateTime.setHours(hours, minutes, 0, 0);

      const now = new Date();
      const hoursUntilReservation = (reservationDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      return hoursUntilReservation >= 2;
    } catch (error) {
      logger.error('Failed to check if reservation can be modified', {
        error,
        reservationId,
      });
      return false;
    }
  }
}

// Export singleton instance
export const reservationService = new ReservationService();