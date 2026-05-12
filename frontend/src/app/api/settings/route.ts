import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'general'; // general, payment, shipping, security

    // Mock settings data
    const settingsData = {
      general: {
        siteName: 'The Saffron Lounge',
        siteDescription: 'Authentic Indian cuisine and fine dining experience',
        contactEmail: 'info@saffronlounge.com',
        contactPhone: '+1 (555) 123-4567',
        address: '123 Culinary Street, Food City, FC 12345',
        businessHours: {
          monday: '11:00 AM - 10:00 PM',
          tuesday: '11:00 AM - 10:00 PM',
          wednesday: '11:00 AM - 10:00 PM',
          thursday: '11:00 AM - 10:00 PM',
          friday: '11:00 AM - 11:00 PM',
          saturday: '12:00 PM - 11:00 PM',
          sunday: '12:00 PM - 9:00 PM'
        },
        currency: 'USD',
        timezone: 'America/New_York'
      },
      payment: {
        stripeEnabled: true,
        stripePublishableKey: 'pk_test_...',
        paypalEnabled: false,
        paypalClientId: '',
        cashOnDelivery: true,
        bankTransfer: false,
        minimumOrderAmount: 10.00,
        taxRate: 8.25
      },
      shipping: {
        deliveryEnabled: true,
        deliveryRadius: 25, // miles
        deliveryFee: 2.99,
        freeDeliveryThreshold: 35.00,
        pickupEnabled: true,
        estimatedDeliveryTime: 45, // minutes
        deliveryHours: {
          start: '11:00',
          end: '22:00'
        }
      },
      security: {
        sessionTimeout: 3600, // seconds
        passwordMinLength: 8,
        twoFactorEnabled: false,
        loginAttempts: 5,
        lockoutDuration: 900, // seconds
        ipWhitelist: [],
        auditLogging: true
      }
    };

    const data = settingsData[category as keyof typeof settingsData] || settingsData.general;

    return NextResponse.json({
      success: true,
      data,
      message: `${category} settings retrieved successfully`
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch settings', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, ...settings } = body;

    if (!category) {
      return NextResponse.json(
        { success: false, message: 'Settings category is required' },
        { status: 400 }
      );
    }

    // Mock settings update
    const updatedSettings = {
      ...settings,
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: updatedSettings,
      message: `${category} settings updated successfully`
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update settings', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}