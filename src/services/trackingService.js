/**
 * Tracking Service
 * Handles package tracking queries
 * Note: This is a mock implementation. In production, integrate with actual tracking APIs.
 */
class TrackingService {
    constructor() {
        this.apiEnabled = process.env.TRACKING_API_ENABLED === 'true';
        this.apiEndpoint = process.env.TRACKING_API_ENDPOINT || 'https://api.mysave.cc/tracking';
    }

    /**
     * Get tracking information for a package
     * @param {string} trackingNumber - Tracking number
     * @returns {Promise<Object>} Tracking information
     */
    async getTrackingInfo(trackingNumber) {
        console.log(`[Tracking Service] Looking up: ${trackingNumber}`);

        // In TEST_MODE or when API is not available, return mock data
        if (!this.apiEnabled) {
            return this.getMockTrackingInfo(trackingNumber);
        }

        try {
            // In production, call actual tracking API
            // const response = await fetch(`${this.apiEndpoint}/${trackingNumber}`);
            // const data = await response.json();
            // return data;

            // For now, return mock data
            return this.getMockTrackingInfo(trackingNumber);
        } catch (error) {
            console.error('[Tracking Service] Error:', error.message);
            return {
                found: false,
                trackingNumber: trackingNumber,
                error: 'Unable to retrieve tracking information'
            };
        }
    }

    /**
     * Generate mock tracking information
     * @param {string} trackingNumber - Tracking number
     * @returns {Object} Mock tracking data
     */
    getMockTrackingInfo(trackingNumber) {
        const statuses = [
            {
                status: 'in_transit',
                statusTH: 'กำลังจัดส่ง',
                statusEN: 'In Transit',
                location: 'Bangkok Distribution Center',
                locationTH: 'ศูนย์กระจายสินค้า กรุงเทพฯ',
                estimatedDelivery: '2025-11-27',
                courier: 'Flash Express'
            },
            {
                status: 'out_for_delivery',
                statusTH: 'พัสดุออกจากศูนย์/กำลังนำจ่าย',
                statusEN: 'Out for Delivery',
                location: 'Your Area',
                locationTH: 'พื้นที่ของคุณ',
                estimatedDelivery: 'Today',
                courier: 'Flash Express'
            },
            {
                status: 'delivered',
                statusTH: 'จัดส่งสำเร็จ',
                statusEN: 'Delivered',
                location: 'Delivered to recipient',
                locationTH: 'ส่งถึงผู้รับแล้ว',
                estimatedDelivery: '2025-11-26',
                courier: 'Flash Express'
            }
        ];

        // Random status based on tracking number
        const index = trackingNumber.length % statuses.length;
        const trackingInfo = statuses[index];

        return {
            found: true,
            trackingNumber: trackingNumber,
            ...trackingInfo,
            history: [
                {
                    timestamp: '2025-11-26 10:30',
                    status: 'Package picked up',
                    statusTH: 'รับพัสดุแล้ว'
                },
                {
                    timestamp: '2025-11-26 14:15',
                    status: 'Arrived at sorting center',
                    statusTH: 'ถึงศูนย์คัดแยก'
                },
                {
                    timestamp: '2025-11-26 18:00',
                    status: trackingInfo.statusEN,
                    statusTH: trackingInfo.statusTH
                }
            ]
        };
    }

    /**
     * Format tracking information for LINE message
     * @param {Object} trackingInfo - Tracking information
     * @returns {string} Formatted message
     */
    formatTrackingMessage(trackingInfo) {
        if (!trackingInfo.found) {
            return `ขออภัยค่ะ ไม่พบข้อมูลพัสดุหมายเลข ${trackingInfo.trackingNumber}

กรุณาตรวจสอบ:
• เลขพัสดุถูกต้องหรือไม่
• พัสดุอาจยังไม่ถูกสแกนเข้าระบบ (รอ 2-4 ชม.)

📞 สอบถามเพิ่มเติม:
• โทร: 02-0966494
• LINE: @mysave`;
        }

        const statusEmoji = {
            'in_transit': '🚚',
            'out_for_delivery': '📦',
            'delivered': '✅'
        };

        const emoji = statusEmoji[trackingInfo.status] || '📍';

        return `${emoji} สถานะพัสดุ

🔢 เลขพัสดุ: ${trackingInfo.trackingNumber}
📦 ขนส่งโดย: ${trackingInfo.courier}

📍 สถานะปัจจุบัน:
${trackingInfo.statusTH}
${trackingInfo.locationTH}

📅 ${trackingInfo.status === 'delivered' ? 'จัดส่งเมื่อ' : 'กำหนดส่ง'}: ${trackingInfo.estimatedDelivery}

---

${emoji} Package Status

🔢 Tracking: ${trackingInfo.trackingNumber}
📦 Courier: ${trackingInfo.courier}

📍 Current Status:
${trackingInfo.statusEN}
${trackingInfo.location}

📅 ${trackingInfo.status === 'delivered' ? 'Delivered' : 'Estimated'}: ${trackingInfo.estimatedDelivery}

📞 Contact: 02-0966494 | LINE: @mysave`;
    }

    /**
     * Validate tracking number format
     * @param {string} trackingNumber - Tracking number
     * @returns {boolean} Valid or not
     */
    validateTrackingNumber(trackingNumber) {
        if (!trackingNumber || trackingNumber.length < 8) {
            return false;
        }

        // Accept alphanumeric tracking numbers
        const pattern = /^[A-Z0-9]{8,20}$/i;
        return pattern.test(trackingNumber);
    }
}

// Export singleton instance
const trackingService = new TrackingService();
export default trackingService;
