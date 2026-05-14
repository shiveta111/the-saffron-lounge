const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyDatabase() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║           DATABASE VERIFICATION                        ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Check all tables
    const tables = [
      { name: 'Users', query: () => prisma.user.count() },
      { name: 'Categories', query: () => prisma.category.count() },
      { name: 'Menu Items', query: () => prisma.menu.count() },
      { name: 'Blog Posts', query: () => prisma.blog.count() },
      { name: 'Bookings', query: () => prisma.booking.count() },
      { name: 'Orders', query: () => prisma.order.count() },
      { name: 'Products', query: () => prisma.product.count() },
      { name: 'Contact Submissions', query: () => prisma.contact.count() },
      { name: 'Gallery Items', query: () => prisma.gallery.count() },
      { name: 'Events', query: () => prisma.event.count() },
      { name: 'Services', query: () => prisma.service.count() },
      { name: 'Testimonials', query: () => prisma.testimonial.count() },
      { name: 'Team Members', query: () => prisma.team.count() },
      { name: 'FAQ', query: () => prisma.fAQ.count() },
      { name: 'Newsletter', query: () => prisma.newsletter.count() },
      { name: 'Reservations', query: () => prisma.reservation.count() },
      { name: 'Reviews', query: () => prisma.review.count() },
      { name: 'Promotions', query: () => prisma.promotion.count() },
      { name: 'Tables', query: () => prisma.table.count() },
      { name: 'Timeslots', query: () => prisma.timeslot.count() },
    ];

    console.log('Current Database State:\n');
    
    for (const table of tables) {
      try {
        const count = await table.query();
        const status = count > 0 ? '✅' : '⚪';
        console.log(`${status} ${table.name.padEnd(25)} ${count} record(s)`);
      } catch (error) {
        console.log(`❌ ${table.name.padEnd(25)} Error: ${error.message}`);
      }
    }

    console.log('\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDatabase();
