const PDFDocument = require('pdfkit');

const generateReceipt = (booking, user, room, payment) => new Promise((resolve, reject) => {
  try {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const buffers = [];
    doc.on('data', b => buffers.push(b));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Header
    doc.rect(0, 0, doc.page.width, 110).fill('#6366f1');
    doc.fillColor('#fff').fontSize(26).font('Helvetica-Bold').text('HostelHub', 50, 40);
    doc.fontSize(12).font('Helvetica').text('Smart Hostel Booking', 50, 72);
    doc.fillColor('#fff').fontSize(11).text('Booking Receipt', 0, 80, { align: 'right', width: doc.page.width - 50 });

    doc.fillColor('#111');
    let y = 140;
    doc.fontSize(14).font('Helvetica-Bold').text('Receipt Details', 50, y);
    y += 24;

    const row = (label, value) => {
      doc.font('Helvetica-Bold').fontSize(10).text(label, 50, y);
      doc.font('Helvetica').text(String(value), 200, y);
      y += 18;
    };

    row('Booking ID:', booking.bookingId);
    row('Date:', new Date(booking.createdAt).toLocaleString('en-IN'));
    row('Customer:', user.name);
    row('Email:', user.email);
    row('Mobile:', user.mobile);

    y += 10;
    doc.fontSize(14).font('Helvetica-Bold').text('Room', 50, y); y += 24;
    row('Hostel:', room.hostelName);
    row('Room:', `${room.title} (${room.category})`);
    row('City:', room.location?.city || '-');
    row('AC:', room.ac ? 'Yes' : 'No');
    row('Food:', booking.foodIncluded ? 'Included' : 'Not Included');
    row('Check-in:', new Date(booking.checkIn).toDateString());
    row('Check-out:', new Date(booking.checkOut).toDateString());
    row('Duration:', `${booking.durationCount} ${booking.durationType}`);

    y += 10;
    doc.fontSize(14).font('Helvetica-Bold').text('Payment', 50, y); y += 24;
    row('Base Amount:', `₹${booking.pricing.baseAmount}`);
    if (booking.pricing.foodAmount) row('Food Amount:', `₹${booking.pricing.foodAmount}`);
    row('GST (12%):', `₹${booking.pricing.gst}`);
    row('Total Paid:', `₹${booking.pricing.totalAmount}`);
    row('Payment Status:', (booking.paymentStatus || 'pending').toUpperCase());
    if (payment?.phonepeTransactionId) row('Transaction ID:', payment.phonepeTransactionId);
    if (payment?.merchantTransactionId) row('Order ID:', payment.merchantTransactionId);
    row('Method:', payment?.method || 'UPI');

    // Footer
    y += 30;
    doc.fontSize(9).fillColor('#6b7280').text(
      'GSTIN: 36ABCDE1234F1Z5  |  HostelHub Pvt Ltd, Hyderabad, India\nThis is a system-generated receipt and does not require a signature.',
      50, y, { align: 'center', width: doc.page.width - 100 }
    );

    doc.end();
  } catch (err) { reject(err); }
});

module.exports = { generateReceipt };
