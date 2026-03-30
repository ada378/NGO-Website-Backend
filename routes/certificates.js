const express = require('express');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const Donation = require('../models/Donation');
const User = require('../models/User');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'hope_foundation_secret_key_2024';

const certsDir = path.join(__dirname, '..', 'certificates');
if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true });
}

const numberToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
                  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if (num === 0) return 'Zero';
    if (num < 20) return ones[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + numberToWords(num % 100) : '');
    if (num < 100000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '');
    if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + numberToWords(num % 100000) : '');
    return numberToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + numberToWords(num % 10000000) : '');
};

router.post('/generate', async (req, res) => {
    try {
        const { donationId, type } = req.body;
        
        const donation = await Donation.findById(donationId);
        if (!donation) {
            return res.status(404).json({ error: 'Donation not found' });
        }

        if (donation.status !== 'completed') {
            return res.status(400).json({ error: 'Donation not completed yet' });
        }

        const verificationUrl = `https://hopefoundation.org/verify/${donation.certificateId}`;
        const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, { width: 100 });

        const filename = `${type}_${donation.certificateId}_${Date.now()}.pdf`;
        const filePath = path.join(certsDir, filename);

        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        doc.rect(0, 0, doc.page.width, doc.page.height).fill('#FDF8F3');

        doc.rect(10, 10, doc.page.width - 20, doc.page.height - 20).stroke('#2D5A27', 2);

        doc.rect(20, 20, doc.page.width - 40, 80).fill('#2D5A27');
        
        doc.fillColor('#FFFFFF')
           .fontSize(28)
           .font('Helvetica-Bold')
           .text('HOPE FOUNDATION', 0, 40, { align: 'center' });
        
        doc.fontSize(12)
           .font('Helvetica')
           .text('Transforming Lives, Building Futures', 0, 70, { align: 'center' });

        doc.fillColor('#1A1A1A')
           .fontSize(10)
           .text('Registered Under Section 12A & 80G of the Income Tax Act, 1961', 0, 95, { align: 'center' });
        
        doc.text('NGO Registration No: NGO-MH-2024-001234 | PAN: AABTH1234B | FCRA: 123456789', 0, 110, { align: 'center' });

        doc.moveDown(3);

        if (type === 'donation') {
            doc.fontSize(24)
               .font('Helvetica-Bold')
               .fillColor('#2D5A27')
               .text('CERTIFICATE OF DONATION', { align: 'center' });
        } else {
            doc.fontSize(24)
               .font('Helvetica-Bold')
               .fillColor('#2D5A27')
               .text('80G TAX EXEMPTION CERTIFICATE', { align: 'center' });
        }

        doc.moveDown(2);

        doc.fontSize(12)
           .font('Helvetica')
           .fillColor('#666666')
           .text('This is to certify that we have received a generous donation from', { align: 'center' });

        doc.moveDown();
        
        doc.fontSize(20)
           .font('Helvetica-Bold')
           .fillColor('#D4A84B')
           .text(donation.donorName.toUpperCase(), { align: 'center' });

        doc.moveDown();

        const amountWords = numberToWords(Math.floor(donation.amount));
        const formattedAmount = new Intl.NumberFormat('en-IN').format(donation.amount);

        doc.fontSize(12)
           .font('Helvetica')
           .fillColor('#666666')
           .text(`of Rupees ${amountWords} Only (₹${formattedAmount})`, { align: 'center' });

        doc.moveDown(2);

        doc.fontSize(12)
           .font('Helvetica')
           .fillColor('#1A1A1A')
           .text(`on ${new Date(donation.completedAt).toLocaleDateString('en-IN', { 
               day: 'numeric', 
               month: 'long', 
               year: 'numeric' 
           })}`, { align: 'center' });

        doc.moveDown(2);

        if (type === 'donation') {
            doc.fontSize(11)
               .fillColor('#666666')
               .text('Your generous contribution will be used for our charitable programs including', { align: 'center' });
            doc.text(`Education, Healthcare, Women Empowerment, and Environment Conservation.`, { align: 'center' });
        } else {
            doc.fontSize(11)
               .fillColor('#666666')
               .text('Under Section 80G of the Income Tax Act, 1961, your donation qualifies for', { align: 'center' });
            doc.text('50% deduction from your taxable income. This certificate is valid for the', { align: 'center' });
            doc.text(`financial year ${new Date().getFullYear()}-${new Date().getFullYear() + 1}.`, { align: 'center' });
        }

        doc.moveDown(3);

        const tableTop = doc.y;
        doc.rect(80, tableTop, 200, 60).stroke('#E0E0E0');
        doc.rect(350, tableTop, 200, 60).stroke('#E0E0E0');

        doc.fontSize(9)
           .fillColor('#666666')
           .text('Certificate ID', 80, tableTop + 10, { width: 200, align: 'center' })
           .font('Helvetica-Bold')
           .fillColor('#2D5A27')
           .text(donation.certificateId, 80, tableTop + 25, { width: 200, align: 'center' })
           .font('Helvetica')
           .fillColor('#666666')
           .text('Receipt No', 350, tableTop + 10, { width: 200, align: 'center' })
           .font('Helvetica-Bold')
           .fillColor('#2D5A27')
           .text(donation.receiptNumber, 350, tableTop + 25, { width: 200, align: 'center' });

        const imgY = tableTop + 80;
        if (qrCodeDataUrl) {
            const qrBuffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
            doc.image(qrBuffer, 280, imgY, { width: 50 });
            doc.fontSize(8)
               .fillColor('#666666')
               .text('Scan to verify', 260, imgY + 55, { width: 90, align: 'center' });
        }

        const signY = doc.page.height - 150;
        
        doc.moveTo(100, signY).lineTo(250, signY).stroke('#1A1A1A');
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor('#2D5A27')
           .text('Dr. Rajesh Kumar', 100, signY + 10, { width: 150, align: 'center' })
           .font('Helvetica')
           .fillColor('#666666')
           .fontSize(9)
           .text('Founder & Chairman', 100, signY + 25, { width: 150, align: 'center' })
           .text('Hope Foundation', 100, signY + 38, { width: 150, align: 'center' });

        doc.moveTo(380, signY).lineTo(530, signY).stroke('#1A1A1A');
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor('#2D5A27')
           .text('Priya Sharma', 380, signY + 10, { width: 150, align: 'center' })
           .font('Helvetica')
           .fillColor('#666666')
           .fontSize(9)
           .text('Secretary', 380, signY + 25, { width: 150, align: 'center' })
           .text('Hope Foundation', 380, signY + 38, { width: 150, align: 'center' });

        doc.fontSize(8)
           .fillColor('#999999')
           .text('Generated on: ' + new Date().toISOString(), 50, doc.page.height - 50)
           .text('Verify at: ' + verificationUrl, 50, doc.page.height - 38);

        doc.end();

        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });

        const certificateUrl = `/certificates/${filename}`;
        
        donation.certificateGenerated = true;
        donation.certificateUrl = certificateUrl;
        if (type === '80g') {
            donation.taxExempt80G = true;
        }
        await donation.save();

        res.json({
            message: 'Certificate generated successfully',
            certificate: {
                id: donation.certificateId,
                url: certificateUrl,
                type,
                downloadUrl: `/api/certificates/${donation.certificateId}/download`
            }
        });

    } catch (error) {
        console.error('Certificate generation error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/:certificateId/download', async (req, res) => {
    try {
        const { certificateId } = req.params;
        
        const donation = await Donation.findOne({ certificateId });
        if (!donation) {
            return res.status(404).json({ error: 'Certificate not found' });
        }

        const files = fs.readdirSync(certsDir);
        const certFile = files.find(f => f.includes(certificateId) && f.endsWith('.pdf'));
        
        if (!certFile) {
            return res.status(404).json({ error: 'Certificate file not found' });
        }

        res.download(path.join(certsDir, certFile), `HopeFoundation_Certificate_${certificateId}.pdf`);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/verify/:certificateId', async (req, res) => {
    try {
        const { certificateId } = req.params;
        
        const donation = await Donation.findOne({ certificateId });
        if (!donation) {
            return res.status(404).json({ valid: false, error: 'Certificate not found' });
        }

        res.json({
            valid: true,
            certificate: {
                id: donation.certificateId,
                donorName: donation.anonymous ? 'Anonymous' : donation.donorName,
                amount: donation.amount,
                date: donation.completedAt,
                status: donation.status,
                program: donation.program
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/receipt/generate', async (req, res) => {
    try {
        const { donationId } = req.body;
        
        const donation = await Donation.findById(donationId);
        if (!donation) {
            return res.status(404).json({ error: 'Donation not found' });
        }

        if (donation.status !== 'completed') {
            return res.status(400).json({ error: 'Donation not completed yet' });
        }

        const filename = `Receipt_${donation.receiptNumber}_${Date.now()}.pdf`;
        const filePath = path.join(certsDir, filename);

        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        doc.rect(0, 0, doc.page.width, doc.page.height).fill('#FFFFFF');

        doc.rect(0, 0, doc.page.width, 100).fill('#2D5A27');
        
        doc.fillColor('#FFFFFF')
           .fontSize(24)
           .font('Helvetica-Bold')
           .text('PAYMENT RECEIPT', 0, 30, { align: 'center' });
        
        doc.fontSize(10)
           .font('Helvetica')
           .text('Hope Foundation - Transforming Lives, Building Futures', 0, 60, { align: 'center' });

        doc.fillColor('#1A1A1A')
           .fontSize(10)
           .text('Reg. No: NGO-MH-2024-001234 | PAN: AABTH1234B | 80G Approved', 0, 75, { align: 'center' });

        doc.moveDown(4);

        const receiptBox = 120;
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor('#2D5A27')
           .text('RECEIPT DETAILS', 50, receiptBox);

        doc.moveTo(50, receiptBox + 20).lineTo(560, receiptBox + 20).stroke('#2D5A27');

        doc.font('Helvetica')
           .fillColor('#1A1A1A')
           .fontSize(10)
           .text(`Receipt No: ${donation.receiptNumber}`, 50, receiptBox + 35)
           .text(`Date: ${new Date(donation.completedAt).toLocaleDateString('en-IN', { 
               day: 'numeric', 
               month: 'long', 
               year: 'numeric',
               hour: '2-digit',
               minute: '2-digit'
           })}`, 50, receiptBox + 50)
           .text(`Transaction ID: ${donation.transactionId || 'N/A'}`, 50, receiptBox + 65)
           .text(`Payment Method: ${donation.paymentMethod}`, 50, receiptBox + 80);

        doc.text(`Certificate ID: ${donation.certificateId}`, 300, receiptBox + 35)
           .text(`Campaign: ${donation.campaign}`, 300, receiptBox + 50)
           .text(`Program: ${donation.program}`, 300, receiptBox + 65);

        const donorBox = receiptBox + 120;
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor('#2D5A27')
           .text('DONOR DETAILS', 50, donorBox);

        doc.moveTo(50, donorBox + 20).lineTo(560, donorBox + 20).stroke('#2D5A27');

        doc.font('Helvetica')
           .fillColor('#1A1A1A')
           .fontSize(10)
           .text(`Name: ${donation.donorName}`, 50, donorBox + 35)
           .text(`Email: ${donation.donorEmail}`, 50, donorBox + 50)
           .text(`Donation Type: ${donation.recurring ? 'Recurring (' + donation.frequency + ')' : 'One-time'}`, 50, donorBox + 65);

        const amountBox = donorBox + 120;
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor('#2D5A27')
           .text('PAYMENT SUMMARY', 50, amountBox);

        doc.moveTo(50, amountBox + 20).lineTo(560, amountBox + 20).stroke('#2D5A27');

        doc.rect(50, amountBox + 40, 510, 80).fill('#F5F5F5');
        
        doc.fontSize(10)
           .fillColor('#666666')
           .text('Amount Donated:', 70, amountBox + 55);

        doc.fontSize(22)
           .font('Helvetica-Bold')
           .fillColor('#2D5A27')
           .text('₹' + new Intl.NumberFormat('en-IN').format(donation.amount), 70, amountBox + 75);

        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#666666')
           .text(`(${numberToWords(donation.amount)} Only)`, 200, amountBox + 82);

        doc.fontSize(10)
           .fillColor('#27AE60')
           .text('✓ Tax Deductible under 80G', 350, amountBox + 55);

        doc.fontSize(10)
           .fillColor('#666666')
           .text('Tax Benefit: 50% of donation amount', 350, amountBox + 72);

        if (donation.message) {
            doc.fontSize(10)
               .fillColor('#1A1A1A')
               .text(`Message: "${donation.message}"`, 50, amountBox + 140, { width: 510 });
        }

        const bankBox = doc.page.height - 180;
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor('#2D5A27')
           .text('BANK DETAILS', 50, bankBox);

        doc.moveTo(50, bankBox + 20).lineTo(560, bankBox + 20).stroke('#2D5A27');

        doc.font('Helvetica')
           .fillColor('#1A1A1A')
           .fontSize(9)
           .text('Account Name: Hope Foundation | Account No: 1234567890 | Bank: State Bank of India', 50, bankBox + 35)
           .text('Branch: Main Branch, Mumbai | IFSC: SBIN0001234 | MICR: 400002134', 50, bankBox + 50)
           .text('UPI ID: hope@sbi | GPay/PhonePe: hope@okhdfcbank', 50, bankBox + 65);

        doc.fontSize(8)
           .fillColor('#999999')
           .text('This is a system-generated receipt and does not require signature.', 50, doc.page.height - 60)
           .text('For queries, contact: info@hopefoundation.org | +91 98765 43210', 50, doc.page.height - 48)
           .text('Generated: ' + new Date().toISOString(), 50, doc.page.height - 36);

        doc.end();

        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });

        const receiptUrl = `/certificates/${filename}`;
        
        donation.receiptGenerated = true;
        donation.receiptUrl = receiptUrl;
        await donation.save();

        res.json({
            message: 'Receipt generated successfully',
            receipt: {
                number: donation.receiptNumber,
                url: receiptUrl,
                downloadUrl: `/api/certificates/receipt/${donation.receiptNumber}/download`
            }
        });

    } catch (error) {
        console.error('Receipt generation error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/receipt/:receiptNumber/download', async (req, res) => {
    try {
        const { receiptNumber } = req.params;
        
        const donation = await Donation.findOne({ receiptNumber });
        if (!donation) {
            return res.status(404).json({ error: 'Receipt not found' });
        }

        const files = fs.readdirSync(certsDir);
        const receiptFile = files.find(f => f.includes(receiptNumber) && f.endsWith('.pdf'));
        
        if (!receiptFile) {
            return res.status(404).json({ error: 'Receipt file not found' });
        }

        res.download(path.join(certsDir, receiptFile), `HopeFoundation_Receipt_${receiptNumber}.pdf`);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
