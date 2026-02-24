const Tesseract = require('tesseract.js');
const AppError = require('../utils/AppError');

class OcrService {
    /**
     * Verifies if an image buffer/base64 contains keywords indicating a National ID.
     * @param {string|Buffer} imageSource - The base64 string or image buffer
     * @returns {Promise<boolean>}
     */
    async verifyNationalId(imageSource) {
        try {
            // Run Tesseract OCR with Arabic and English
            const result = await Tesseract.recognize(
                imageSource,
                'ara+eng', // Can use just 'ara' if we only care about Arabic text
                {
                    logger: (m) => { }, // Suppress logs or watch progress
                }
            );

            const text = result.data.text || '';

            // Look for common Egyptian National ID keywords or patterns
            const keywords = [
                'بطاقة تحقيق شخصية',
                'الرقم القومي',
                'جمهورية مصر العربية',
                'وزارة الداخلية',
            ];

            // Also check if there's a 14 digit number anywhere
            const hasNationalIdNumber = /\b\d{14}\b/.test(text.replace(/\s+/g, ''));

            // Check if any keyword exists
            const hasKeyword = keywords.some((kw) => text.includes(kw));

            return hasKeyword || hasNationalIdNumber;
        } catch (error) {
            console.error('OCR Error:', error);
            // In case OCR fails (e.g. invalid image format, memory issue), we shouldn't block completely 
            // but we should probably throw or let the caller decide
            return false; // Safest default is to reject if we can't read it
        }
    }
}

module.exports = new OcrService();
