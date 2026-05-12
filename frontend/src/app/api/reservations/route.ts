import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for demo purposes (replace with database in production)
let reservations: any[] = [];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { name, email, phone, date, time, guests, specialRequests } = body;

    if (!name || !email || !phone || !date || !time || !guests) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate date is in the future
    const reservationDate = new Date(`${date}T${time}`);
    const now = new Date();

    if (reservationDate <= now) {
      return NextResponse.json(
        { error: 'Reservation must be in the future' },
        { status: 400 }
      );
    }

    // Generate reservation ID
    const reservationId = `RES${Date.now().toString().slice(-6)}`;

    // Create reservation object
    const reservation = {
      id: reservationId,
      name,
      email,
      phone,
      date,
      time,
      guests: parseInt(guests),
      specialRequests: specialRequests || '',
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      reservationDateTime: reservationDate.toISOString()
    };

    // Store reservation (in production, save to database)
    reservations.push(reservation);

    // Send confirmation email (placeholder - implement actual email service)
    console.log(`Confirmation email would be sent to ${email} for reservation ${reservationId}`);

    return NextResponse.json({
      success: true,
      reservationId,
      message: 'Reservation created successfully',
      reservation: {
        id: reservationId,
        name,
        email,
        date,
        time,
        guests: reservation.guests
      }
    });

  } catch (error) {
    console.error('Reservation creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return all reservations (for admin purposes)
  return NextResponse.json({
    reservations,
    total: reservations.length
  });
}
