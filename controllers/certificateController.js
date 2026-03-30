const Donation = require('../models/Donation');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

exports.generateCertificate = async (req, res) => {
    try {
        const { donationId, type } = req.body;

        const donation = await Donation.findById(donationId);
        if (!donation) {
            return res.status(404).json({ error: 'Donation not found' });
        }

        const certDir = path.join(__dirname, '../certificates');
        if (!fs.existsSync(certDir)) {
            fs.mkdirSync(certDir, { recursive: true });
        }

        const fileName = `${type}_${donationId}_${Date.now()}.pdf`;
        const filePath = path.join(certDir, fileName);

        const doc = new PDFDocument({ layout: 'landscape', size: 'A4' });
        const writeStream = fs.createWriteStream(filePath);

        doc.pipe(writeStream);

        doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
           .stroke('#D4AF37');

        doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60)
           .stroke('#D4AF37');

        if (type === 'donation') {
            doc.fontSize(36).fillColor('#D4AF37')
               .text('CERTIFICATE OF DONATION', 0, 80, { align: 'center' });
            
            doc.fontSize(16).fillColor('#666')
               .text('This is to certify that', 0, 140, { align: 'center' });
            
            doc.fontSize(28).fillColor('#333')
               .text(donation.donorName, 0, 170, { align: 'center' });
            
            doc.fontSize(16).fillColor('#666')
               .text('has generously donated', 0, 210, { align: 'center' });
            
            doc.fontSize(32).fillColor('#D4AF37')
               .text(`₹${donation.amount.toLocaleString()}`, 0, 240, { align: 'center' });
            
            doc.fontSize(16).fillColor('#666')
               .text(`(${donation.amountInWords} Rupees Only)`, 0, 280, { align: 'center' });
            
            doc.fontSize(14).fillColor('#666')
               .text(`Certificate ID: ${donation.certificateId || 'N/A'}`, 0, 340, { align: 'center' });
            
            doc.fontSize(12).fillColor('#999')
               .text('Hope Foundation | www.hopefoundation.org', 0, 520, { align: 'center' });
        } else {
            doc.fontSize(28).fillColor('#D4AF37')
               .text('80G TAX BENEFIT CERTIFICATE', 0, 60, { align: 'center' });
            
            doc.fontSize(14).fillColor('#666')
               .text('Hope Foundation (Registration No: NGO-MH-2024-001234)', 0, 100, { align: 'center' });
            
            doc.fontSize(12).fillColor('#666')
               .text('PAN: AABTH1234B | 80G Certificate Valid until March 2027', 0, 120, { align: 'center' });
            
            doc.fontSize(14).fillColor('#666')
               .text('This is to certify that the following donation has been received:', 0, 160, { align: 'center' });
            
            doc.fontSize(24).fillColor('#333')
               .text(donation.donorName, 0, 200, { align: 'center' });
            
            doc.fontSize(14).fillColor('#666')
               .text(`Amount: ₹${donation.amount.toLocaleString()}`, 0, 250, { align: 'center' });
            
            doc.fontSize(14).fillColor('#666')
               .text(`Date: ${new Date(donation.completedAt || donation.createdAt).toLocaleDateString('en-IN')}`, 0, 280, { align: 'center' });
            
            doc.fontSize(12).fillColor('#666')
               .text('50% of this donation is tax-deductible under Section 80G of the Income Tax Act, 1961.', 0, 320, { align: 'center' });
            
            doc.fontSize(10).fillColor('#999')
               .text('Hope Foundation | www.hopefoundation.org', 0, 520, { align: 'center' });
        }

        doc.end();

        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });

        const downloadUrl = `/certificates/${fileName}`;

        res.json({
            message: 'Certificate generated',
            certificate: {
                fileName,
                downloadUrl,
                type
            }
        });
    } catch (error) {
        console.error('Certificate generation error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.generateReceipt = async (req, res) => {
    try {
        const { donationId } = req.body;

        const donation = await Donation.findById(donationId);
        if (!donation) {
            return res.status(404).json({ error: 'Donation not found' });
        }

        const certDir = path.join(__dirname, '../certificates');
        if (!fs.existsSync(certDir)) {
            fs.mkdirSync(certDir, { recursive: true });
        }

        const fileName = `receipt_${donationId}_${Date.now()}.pdf`;
        const filePath = path.join(certDir, fileName);

        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const writeStream = fs.createWriteStream(filePath);

        doc.pipe(writeStream);

        doc.fontSize(24).fillColor('#333')
           .text('DONATION RECEIPT', { align: 'center' });

        doc.moveTo(50, 100).lineTo(550, 100).stroke('#DDD');

        doc.fontSize(12).fillColor('#666')
           .text('Hope Foundation', 50, 120)
           .text('123 Mahatma Gandhi Road, Mumbai - 400001', 50, 135)
           .text('Email: donate@hopefoundation.org | Phone: +91 98765 43210', 50, 150);

        doc.moveTo(50, 170).lineTo(550, 170).stroke('#DDD');

        doc.fontSize(14).fillColor('#333')
           .text('Receipt Details', 50, 185);

        doc.fontSize(12).fillColor('#666')
           .text(`Receipt Number: ${donation.receiptNumber || 'N/A'}`, 50, 210)
           .text(`Date: ${new Date(donation.completedAt || donation.createdAt).toLocaleDateString('en-IN')}`, 50, 230)
           .text(`Payment ID: ${donation.razorpayPaymentId || donation.transactionId || 'N/A'}`, 50, 250);

        doc.moveTo(50, 270).lineTo(550, 270).stroke('#DDD');

        doc.fontSize(14).fillColor('#333')
           .text('Donor Details', 50, 285);

        doc.fontSize(12).fillColor('#666')
           .text(`Name: ${donation.donorName}`, 50, 310)
           .text(`Email: ${donation.donorEmail}`, 50, 330);

        doc.moveTo(50, 350).lineTo(550, 350).stroke('#DDD');

        doc.fontSize(14).fillColor('#333')
           .text('Donation Details', 50, 365);

        doc.fontSize(12).fillColor('#666')
           .text(`Amount: ₹${donation.amount.toLocaleString()}`, 50, 390)
           .text(`Amount in Words: ${donation.amountInWords}`, 50, 410)
           .text(`Program: ${donation.program || 'General'}`, 50, 430)
           .text(`Payment Method: ${donation.paymentMethod || 'Online'}`, 50, 450)
           .text(`Status: ${donation.status === 'completed' ? 'Payment Received' : donation.status}`, 50, 470);

        if (donation.message) {
            doc.text(`Message: ${donation.message}`, 50, 490);
        }

        doc.fontSize(10).fillColor('#999')
           .text('This is a computer-generated receipt.', 50, 700, { align: 'center' });

        doc.end();

        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });

        const downloadUrl = `/certificates/${fileName}`;

        res.json({
            message: 'Receipt generated',
            receipt: {
                fileName,
                downloadUrl
            }
        });
    } catch (error) {
        console.error('Receipt generation error:', error);
        res.status(500).json({ error: error.message });
    }
};
