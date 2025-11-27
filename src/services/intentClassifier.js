/**
 * Intent Classifier Service
 * Classifies incoming messages into: FAQ, TRACKING, or ESCALATE
 */
class IntentClassifier {
    constructor() {
        this.confidenceThreshold = parseFloat(process.env.INTENT_CONFIDENCE_THRESHOLD) || 0.7;
    }

    /**
     * Classify message intent
     * @param {string} message - User's message
     * @returns {Object} Intent classification result
     */
    classifyIntent(message) {
        const lowerMessage = message.toLowerCase();

        // Priority 1: Check for Tracking Intent (highest priority)
        const trackingResult = this.checkTrackingIntent(message, lowerMessage);
        if (trackingResult.isTracking) {
            return {
                type: 'TRACKING',
                confidence: trackingResult.confidence,
                trackingNumber: trackingResult.trackingNumber,
                category: 'tracking'
            };
        }

        // Priority 2: Check for FAQ Intent
        const faqResult = this.checkFAQIntent(lowerMessage);
        if (faqResult.isFAQ) {
            return {
                type: 'FAQ',
                confidence: faqResult.confidence,
                category: faqResult.category
            };
        }

        // Priority 3: Default to Escalation
        return {
            type: 'ESCALATE',
            confidence: 0.5,
            reason: 'No clear intent detected or requires human assistance'
        };
    }

    /**
     * Check if message is tracking-related
     */
    checkTrackingIntent(originalMessage, lowerMessage) {
        const trackingKeywords = [
            // Thai
            'ติดตาม', 'เช็ค', 'ตรวจสอบ', 'พัสดุ', 'ของฉัน', 'ถึงไหน',
            // English
            'track', 'tracking', 'check', 'where is', 'status', 'package'
        ];

        const hasKeyword = trackingKeywords.some(keyword =>
            lowerMessage.includes(keyword)
        );

        // Extract potential tracking number
        // Supports various formats:
        // - TH014781D6JD0B (letters + numbers mixed)
        // - 7228112769731265 (pure numbers)
        // - SHIPBA4361694 (prefix + numbers)
        // - WB047589355TH (numbers + suffix)
        // - JA189166117TH (prefix + numbers + suffix)

        // Try to find alphanumeric sequence of 10-20 characters
        const trackingNumberPattern = /\b[A-Z0-9]{10,20}\b/i;
        const matches = originalMessage.match(new RegExp(trackingNumberPattern, 'gi'));

        if (matches && matches.length > 0) {
            // Get the longest match (most likely to be tracking number)
            const trackingNumber = matches.reduce((longest, current) =>
                current.length > longest.length ? current : longest
            );

            // Validate it looks like a tracking number (has at least 3 consecutive digits or letters)
            const hasMinConsecutive = /\d{3,}|[A-Z]{3,}/i.test(trackingNumber);

            if (hasMinConsecutive) {
                return {
                    isTracking: true,
                    confidence: 0.95,
                    trackingNumber: trackingNumber.toUpperCase()
                };
            }
        }

        if (hasKeyword) {
            return {
                isTracking: true,
                confidence: 0.75,
                trackingNumber: null
            };
        }

        return {
            isTracking: false,
            confidence: 0,
            trackingNumber: null
        };
    }

    /**
     * Check if message is FAQ-related
     */
    checkFAQIntent(lowerMessage) {
        const categories = {
            shipping_rates: {
                keywords: [
                    'ราคา', 'ค่าส่ง', 'เท่าไหร่', 'rate', 'price', 'cost', 'how much',
                    'flash', 'shopee', 'thailand post', 'kex'
                ],
                weight: 1.0
            },
            delivery_time: {
                keywords: [
                    'นาน', 'จัดส่ง', 'delivery', 'time', 'ระยะเวลา', 'how long',
                    'เมื่อไหร่', 'when', 'arrive'
                ],
                weight: 1.0
            },
            account_verification: {
                keywords: [
                    'ยืนยันตัวตน', 'verify', 'verification', 'สมัคร', 'account',
                    'บัญชี', 'register', 'signup'
                ],
                weight: 0.9
            },
            cod_account: {
                keywords: [
                    'cod', 'เก็บเงินปลายทาง', 'สมัคร cod', 'บัญชีธนาคาร'
                ],
                weight: 0.9
            },
            required_documents: {
                keywords: [
                    'เอกสาร', 'ต้องใช้', 'document', 'required', 'need',
                    'บัตรประชาชน', 'หนังสือเดินทาง', 'สำเนา'
                ],
                weight: 0.85
            },
            create_account: {
                keywords: [
                    'เปิดระบบ', 'สร้างบัญชี', 'create', 'setup', 'อุปกรณ์',
                    'ได้รับอุปกรณ์', 'equipment'
                ],
                weight: 0.85
            },
            payment: {
                keywords: [
                    'ชำระเงิน', 'payment', 'จ่าย', 'pay', 'วิธีจ่าย', 'method'
                ],
                weight: 0.8
            },
            general: {
                keywords: [
                    'ติดต่อ', 'contact', 'help', 'ช่วย', 'สอบถาม', 'question'
                ],
                weight: 0.6
            }
        };

        let bestMatch = null;
        let highestScore = 0;

        for (const [category, config] of Object.entries(categories)) {
            const matchCount = config.keywords.filter(keyword =>
                lowerMessage.includes(keyword)
            ).length;

            if (matchCount > 0) {
                const score = (matchCount / config.keywords.length) * config.weight;
                if (score > highestScore) {
                    highestScore = score;
                    bestMatch = category;
                }
            }
        }

        if (bestMatch && highestScore >= 0.3) {
            return {
                isFAQ: true,
                confidence: Math.min(0.95, highestScore * 1.5),
                category: bestMatch
            };
        }

        return {
            isFAQ: false,
            confidence: 0,
            category: null
        };
    }

    /**
     * Check if message should be escalated to CS
     */
    shouldEscalate(message) {
        const escalationKeywords = [
            // Complaints
            'ร้องเรียน', 'complaint', 'angry', 'โกง', 'cheat',
            // Refunds
            'คืนเงิน', 'refund', 'cancel', 'ยกเลิก',
            // Technical issues
            'error', 'broken', 'เสีย', 'ใช้ไม่ได้',
            // Urgent
            'urgent', 'ด่วน', 'emergency'
        ];

        const lowerMessage = message.toLowerCase();
        return escalationKeywords.some(keyword =>
            lowerMessage.includes(keyword)
        );
    }

    /**
     * Get human-readable intent description
     */
    getIntentDescription(intent) {
        const descriptions = {
            'FAQ': `FAQ Query (${intent.category || 'general'})`,
            'TRACKING': `Tracking Query${intent.trackingNumber ? ` (${intent.trackingNumber})` : ''}`,
            'ESCALATE': `CS Escalation (${intent.reason})`
        };

        return descriptions[intent.type] || 'Unknown Intent';
    }
}

// Export singleton instance
const intentClassifier = new IntentClassifier();
export default intentClassifier;
