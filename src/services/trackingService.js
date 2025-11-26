/**
 * Tracking Service - Integrated with Real API
 * Handles package tracking queries using the MySave tracking API
 */
class TrackingService {
    constructor() {
        this.apiEndpoint = process.env.TRACKING_API_ENDPOINT || 'https://api-bi.my-group.net/v1/callback-gateway/express/trackings';
        this.useRealAPI = process.env.USE_REAL_TRACKING_API !== 'false'; // Default to true
    }

    /**
     * Get tracking information for a package
     * @param {string} trackingNumber - Tracking number
     * @returns {Promise<Object>} Tracking information
     */
    async getTrackingInfo(trackingNumber) {
        console.log(`[Tracking Service] Looking up: ${trackingNumber}`);

        if (!this.useRealAPI) {
            console.log('[Tracking Service] Using mock data (USE_REAL_TRACKING_API=false)');
            return this.getMockTrackingInfo(trackingNumber);
        }

        try {
            // Call real tracking API
            const url = `${this.apiEndpoint}?courier_tracking_numbers=${trackingNumber}`;
            console.log(`[Tracking Service] Calling API: ${url}`);

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`API returned ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // API returns an array, get first result
            if (!data || data.length === 0) {
                return {
                    found: false,
                    trackingNumber: trackingNumber,
                    error: 'Tracking number not found'
                };
            }

            const trackingData = data[0];
            return this.parseAPIResponse(trackingData);

        } catch (error) {
            console.error('[Tracking Service] Error calling API:', error.message);

            // Return error response
            return {
                found: false,
                trackingNumber: trackingNumber,
                error: `Unable to retrieve tracking information: ${error.message}`
            };
        }
    }

    /**
     * Parse API response into standardized format
     * @param {Object} apiData - Raw API response
     * @returns {Object} Parsed tracking info
     */
    parseAPIResponse(apiData) {
        const {
            courier,
            courier_tracking_number,
            service_tracking_number,
            shipment_status,
            shipment_status_updated_at,
            shipment_events
        } = apiData;

        // Get latest event (first in array)
        const latestEvent = shipment_events && shipment_events.length > 0
            ? shipment_events[0]
            : null;

        if (!latestEvent) {
            return {
                found: false,
                trackingNumber: courier_tracking_number,
                error: 'No tracking events found'
            };
        }

        // Map status to user-friendly info
        const statusInfo = this.getStatusInfo(shipment_status);

        return {
            found: true,
            trackingNumber: courier_tracking_number,
            serviceTrackingNumber: service_tracking_number,
            courier: this.getCourierDisplayName(courier),
            courierCode: courier,

            // Current status
            status: shipment_status,
            statusTH: latestEvent.shipment_status_desc,
            statusEN: statusInfo.statusEN,
            statusEmoji: statusInfo.emoji,

            // Latest location and time
            location: latestEvent.location || 'กำลังอัพเดท',
            locationTH: latestEvent.location || 'กำลังอัพเดท',
            remark: latestEvent.remark,
            timestamp: latestEvent.timestamp,
            updatedAt: shipment_status_updated_at,

            // Full history
            history: shipment_events.slice(0, 5).map(event => ({
                timestamp: event.timestamp,
                statusTH: event.shipment_status_desc,
                location: event.location,
                remark: event.remark
            })),

            // Recipient info (if delivered)
            recipient: apiData.recipient,

            // Raw data for debugging
            rawStatus: shipment_status
        };
    }

    /**
     * Get status information with emoji and English translation
     */
    getStatusInfo(status) {
        const statusMap = {
            'BOOKED': {
                emoji: '📋',
                statusEN: 'Order Placed',
                color: 'blue'
            },
            'PICKED': {
                emoji: '📦',
                statusEN: 'Picked Up',
                color: 'blue'
            },
            'TRANSIT': {
                emoji: '🚚',
                statusEN: 'In Transit',
                color: 'orange'
            },
            'DELIVERED': {
                emoji: '✅',
                statusEN: 'Delivered',
                color: 'green'
            },
            'FAILED': {
                emoji: '❌',
                statusEN: 'Delivery Failed',
                color: 'red'
            },
            'RETURNED': {
                emoji: '↩️',
                statusEN: 'Returned',
                color: 'red'
            }
        };

        return statusMap[status] || {
            emoji: '📍',
            statusEN: status,
            color: 'gray'
        };
    }

    /**
     * Get display name for courier
     */
    getCourierDisplayName(courierCode) {
        const courierNames = {
            'FLASH': 'Flash Express',
            'SHOPEE': 'Shopee Express (SPX)',
            'JT': 'J&T Express',
            'KERRY': 'Kerry Express',
            'THAIPOST': 'Thailand Post',
            'DHL': 'DHL',
            'NINJAVAN': 'Ninja Van'
        };

        return courierNames[courierCode] || courierCode;
    }

    /**
     * Format tracking information for LINE message
     * @param {Object} trackingInfo - Tracking information
     * @returns {string} Formatted message
     */
    formatTrackingMessage(trackingInfo) {
        if (!trackingInfo.found) {
            return `❌ ไม่พบข้อมูลพัสดุ

🔢 เลขพัสดุ: ${trackingInfo.trackingNumber}

${trackingInfo.error || 'ไม่พบข้อมูลในระบบ'}

กรุณาตรวจสอบ:
• เลขพัสดุถูกต้องหรือไม่
• พัสดุอาจยังไม่ถูกสแกนเข้าระบบ (รอ 2-4 ชม.)

📞 สอบถามเพิ่มเติม:
• โทร: 02-0966494
• LINE OA: @mysave

---

❌ Tracking Not Found

🔢 Tracking: ${trackingInfo.trackingNumber}

${trackingInfo.error || 'No information found'}

Please check:
• Tracking number is correct
• Package may not be scanned yet (wait 2-4 hours)

📞 Contact: 02-0966494 | LINE: @mysave`;
        }

        const emoji = trackingInfo.statusEmoji || '📦';
        const timestamp = this.formatTimestamp(trackingInfo.timestamp);

        let message = `${emoji} สถานะพัสดุ / Package Status

🔢 เลขพัสดุ / Tracking: ${trackingInfo.trackingNumber}
📦 ขนส่ง / Courier: ${trackingInfo.courier}

📍 สถานะปัจจุบัน / Current Status:
${trackingInfo.statusTH}
${trackingInfo.statusEN}

📍 ตำแหน่ง / Location:
${trackingInfo.locationTH}

⏰ อัพเดทล่าสุด / Last Update:
${timestamp}`;

        // Add remark if available
        if (trackingInfo.remark) {
            message += `\n\n💬 รายละเอียด:\n${trackingInfo.remark}`;
        }

        // Add delivery signature for delivered packages
        if (trackingInfo.status === 'DELIVERED' && trackingInfo.recipient?.signature) {
            message += `\n\n✅ มีหลักฐานการเซ็นรับ`;
        }

        // Add recent history
        if (trackingInfo.history && trackingInfo.history.length > 1) {
            message += `\n\n📋 ประวัติล่าสุด / Recent History:`;
            trackingInfo.history.slice(0, 3).forEach((event, index) => {
                const eventTime = this.formatTimestampShort(event.timestamp);
                message += `\n${index + 1}. ${eventTime} - ${event.statusTH}`;
                if (event.location) {
                    message += `\n   ${event.location}`;
                }
            });
        }

        message += `\n\n📞 ติดต่อ / Contact: 02-0966494 | LINE: @mysave`;

        return message;
    }

    /**
     * Format timestamp to Thai readable format
     */
    formatTimestamp(timestamp) {
        if (!timestamp) return 'ไม่ระบุ';

        const date = new Date(timestamp);
        const thaiMonths = [
            'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
            'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
        ];

        const day = date.getDate();
        const month = thaiMonths[date.getMonth()];
        const year = date.getFullYear() + 543; // Thai Buddhist year
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');

        return `${day} ${month} ${year} เวลา ${hours}:${minutes} น.`;
    }

    /**
     * Format timestamp (short version)
     */
    formatTimestampShort(timestamp) {
        if (!timestamp) return '';

        const date = new Date(timestamp);
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');

        return `${day}/${month} ${hours}:${minutes}`;
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

        // Accept various tracking number formats
        // Examples: TH04027XD7PE2F, SPXTH051981188579, 7227115611892065
        const pattern = /^[A-Z0-9]{8,30}$/i;
        return pattern.test(trackingNumber);
    }

    /**
     * Generate mock tracking information (for testing)
     * @param {string} trackingNumber - Tracking number
     * @returns {Object} Mock tracking data
     */
    getMockTrackingInfo(trackingNumber) {
        const statuses = [
            {
                status: 'TRANSIT',
                statusTH: 'กำลังจัดส่ง',
                statusEN: 'In Transit',
                location: 'Bangkok Distribution Center',
                locationTH: 'ศูนย์กระจายสินค้า กรุงเทพฯ',
                courier: 'Flash Express',
                emoji: '🚚'
            },
            {
                status: 'DELIVERED',
                statusTH: 'จัดส่งสำเร็จ',
                statusEN: 'Delivered',
                location: 'Delivered to recipient',
                locationTH: 'ส่งถึงผู้รับแล้ว',
                courier: 'Flash Express',
                emoji: '✅'
            }
        ];

        const index = trackingNumber.length % statuses.length;
        const mockStatus = statuses[index];

        return {
            found: true,
            trackingNumber: trackingNumber,
            ...mockStatus,
            timestamp: new Date().toISOString(),
            remark: 'This is mock data for testing',
            history: []
        };
    }
}

// Export singleton instance
const trackingService = new TrackingService();
export default trackingService;
