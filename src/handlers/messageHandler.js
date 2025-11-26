import { Client } from '@line/bot-sdk';
import mcpService from '../services/mcpService.js';
import aiService from '../services/aiService.js';
import intentClassifier from '../services/intentClassifier.js';
import trackingService from '../services/trackingService.js';
import analytics from '../utils/analytics.js';

/**
 * Message Handler - Processes LINE messages with intent-based routing
 */
class MessageHandler {
    constructor() {
        const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

        if (!accessToken || accessToken === 'your_channel_access_token_here') {
            console.warn('[Message Handler] WARNING: LINE channel access token not configured');
        }

        this.lineClient = new Client({
            channelAccessToken: accessToken
        });
    }

    /**
     * Handle incoming LINE message event with intent classification
     * @param {Object} event - LINE message event
     */
    async handleMessage(event) {
        try {
            // Only handle text messages
            if (event.type !== 'message' || event.message.type !== 'text') {
                console.log('[Message Handler] Skipping non-text message');
                return;
            }

            const userMessage = event.message.text;
            const userId = event.source.userId;

            console.log(`[Message Handler] Received message from ${userId}: "${userMessage}"`);

            // Step 1: Classify intent
            const intent = intentClassifier.classifyIntent(userMessage);
            const intentDesc = intentClassifier.getIntentDescription(intent);

            console.log(`[Message Handler] Intent: ${intentDesc} (confidence: ${intent.confidence})`);

            // Step 2: Route to appropriate handler
            switch (intent.type) {
                case 'FAQ':
                    await this.handleFAQMessage(event, intent);
                    break;

                case 'TRACKING':
                    await this.handleTrackingMessage(event, intent);
                    break;

                case 'ESCALATE':
                    await this.handleEscalation(event, intent);
                    break;

                default:
                    // Fallback to FAQ handler
                    await this.handleFAQMessage(event, intent);
            }

        } catch (error) {
            console.error('[Message Handler] Error handling message:', error);

            // Track error
            analytics.trackQuery({
                question: event.message?.text || 'unknown',
                wasAutoResolved: false,
                error: error.message
            });

            // Try to send error message to user
            try {
                await this.sendReply(
                    event.replyToken,
                    'ขอโทษค่ะ เกิดข้อผิดพลาดชั่วคราว กรุณาลองใหม่อีกครั้งหรือติดต่อทีมงานของเราค่ะ\n\nSorry, an error occurred. Please try again or contact our support team.'
                );
            } catch (replyError) {
                console.error('[Message Handler] Failed to send error message:', replyError);
            }
        }
    }

    /**
     * Handle FAQ-answerable messages
     * @param {Object} event - LINE message event
     * @param {Object} intent - Classified intent
     */
    async handleFAQMessage(event, intent) {
        const userMessage = event.message.text;

        console.log(`[Message Handler] Processing as FAQ (category: ${intent.category || 'general'})`);

        // Load FAQ content
        const faqContent = await mcpService.getFAQContent();

        // Generate AI response
        const response = await aiService.generateResponse(userMessage, faqContent);

        // Send reply to LINE
        await this.sendReply(event.replyToken, response.text);

        // Track analytics
        analytics.trackQuery({
            question: userMessage,
            wasAutoResolved: response.autoResolved,
            intentType: 'FAQ',
            category: intent.category,
            error: response.error
        });

        console.log(`[Message Handler] FAQ response sent (auto-resolved: ${response.autoResolved})`);
    }

    /**
     * Handle tracking queries
     * @param {Object} event - LINE message event
     * @param {Object} intent - Classified intent
     */
    async handleTrackingMessage(event, intent) {
        const userMessage = event.message.text;
        const trackingNumber = intent.trackingNumber;

        console.log(`[Message Handler] Processing as TRACKING (number: ${trackingNumber || 'not extracted'})`);

        if (!trackingNumber) {
            // Ask user to provide tracking number
            const response = `📦 กรุณาระบุเลขพัสดุที่ต้องการติดตามค่ะ

ตัวอย่าง:
• TH1234567890
• ABC12345678

หรือส่งข้อความ: "ติดตาม TH1234567890"

---

📦 Please provide your tracking number

Example:
• TH1234567890  
• ABC12345678

Or send: "track TH1234567890"`;

            await this.sendReply(event.replyToken, response);

            analytics.trackQuery({
                question: userMessage,
                wasAutoResolved: false,
                intentType: 'TRACKING',
                error: 'No tracking number provided'
            });

            return;
        }

        // Validate tracking number
        if (!trackingService.validateTrackingNumber(trackingNumber)) {
            await this.sendReply(
                event.replyToken,
                `❌ รูปแบบเลขพัสดุไม่ถูกต้อง: ${trackingNumber}\n\nกรุณาตรวจสอบและส่งใหม่อีกครั้งค่ะ\n\n---\n\n❌ Invalid tracking number format: ${trackingNumber}\n\nPlease check and try again.`
            );
            return;
        }

        // Get tracking information
        const trackingInfo = await trackingService.getTrackingInfo(trackingNumber);

        // Format response
        const response = trackingService.formatTrackingMessage(trackingInfo);

        // Send reply
        await this.sendReply(event.replyToken, response);

        // Track analytics
        analytics.trackQuery({
            question: userMessage,
            wasAutoResolved: trackingInfo.found,
            intentType: 'TRACKING',
            trackingNumber: trackingNumber
        });

        console.log(`[Message Handler] Tracking response sent (found: ${trackingInfo.found})`);
    }

    /**
     * Handle escalation to CS admin
     * @param {Object} event - LINE message event
     * @param {Object} intent - Classified intent
     */
    async handleEscalation(event, intent) {
        const userMessage = event.message.text;
        const userId = event.source.userId;

        console.log(`[Message Handler] Escalating to CS Admin (reason: ${intent.reason})`);

        // In production, you would:
        // 1. Create ticket in CS system
        // 2. Send notification to CS team via LINE Notify or email
        // 3. Store message in queue database

        // For now, just log it
        console.log(`[CS Escalation] User: ${userId}, Message: "${userMessage}"`);

        // Send user response
        const escalationMessage = `สวัสดีค่ะ 👋

คำถามของคุณต้องให้ทีมงานช่วยตอบโดยตรง
เราได้รับข้อความแล้ว และจะติดต่อกลับภายใน 1-2 ชั่วโมงทำการค่ะ

📞 ช่องทางติดต่อด่วน:
• โทร: 02-0966494 (จ-ศ 8:00-18:00)
• LINE OA: @mysave
• Email: support@mysave.cc

ขอบคุณที่ใช้บริการ MYSAVE ค่ะ 💚

---

Hello! 👋

Your question requires our team to answer directly.
We've received your message and will contact you within 1-2 business hours.

📞 For urgent matters:
• Call: 02-0966494 (Mon-Fri 8:00-18:00)
• LINE OA: @mysave
• Email: support@mysave.cc

Thank you for using MYSAVE 💚`;

        await this.sendReply(event.replyToken, escalationMessage);

        // Track analytics
        analytics.trackQuery({
            question: userMessage,
            wasAutoResolved: false,
            intentType: 'ESCALATE',
            reason: intent.reason
        });

        console.log(`[Message Handler] Escalation message sent`);
    }

    /**
     * Send reply message via LINE
     * @param {string} replyToken - LINE reply token
     * @param {string} text - Message text to send
     */
    async sendReply(replyToken, text) {
        const message = {
            type: 'text',
            text: text
        };

        await this.lineClient.replyMessage(replyToken, message);
    }

    /**
     * Send push message to user (not in reply to a message)
     * @param {string} userId - LINE user ID
     * @param {string} text - Message text to send
     */
    async sendPushMessage(userId, text) {
        const message = {
            type: 'text',
            text: text
        };

        await this.lineClient.pushMessage(userId, message);
    }

    /**
     * Handle follow event (when user adds bot as friend)
     * @param {Object} event - LINE follow event
     */
    async handleFollow(event) {
        const userId = event.source.userId;
        console.log(`[Message Handler] New user followed: ${userId}`);

        const welcomeMessage = `สวัสดีค่ะ! ยินดีต้อนรับสู่ MYSAVE Customer Service Bot 📦

ฉันสามารถช่วยคุณได้:
📦 ราคาและบริการจัดส่ง  
⏰ ระยะเวลาการจัดส่ง
📍 ติดตามพัสดุ (ส่งเลขพัสดุมาได้เลย)
💳 สมัครบัญชี COD
✅ ยืนยันตัวตน
📄 เอกสารที่ต้องใช้

ถามคำถามได้เลยค่ะ! 😊

---

Hello! Welcome to MYSAVE Customer Service Bot 📦

I can help you with:
📦 Shipping rates & services
⏰ Delivery times
📍 Package tracking (just send your tracking number)
💳 COD account registration
✅ Identity verification
📄 Required documents

Feel free to ask me anything! 😊`;

        try {
            await this.sendReply(event.replyToken, welcomeMessage);
        } catch (error) {
            console.error('[Message Handler] Error sending welcome message:', error);
        }
    }

    /**
     * Handle postback event (from interactive buttons)
     * @param {Object} event - LINE postback event
     */
    async handlePostback(event) {
        const data = event.postback.data;
        console.log(`[Message Handler] Received postback: ${data}`);

        // Handle different postback actions
        if (data === 'contact_human') {
            const message = `📞 ช่องทางติดต่อทีมงาน MYSAVE:

• โทร: 02-0966494 (จ-ศ 8:00-18:00)
• LINE OA: @mysave
• Email: support@mysave.cc
• Facebook: facebook.com/mysave

เราพร้อมให้บริการคุณค่ะ! 😊

---

📞 Contact MYSAVE Support:

• Call: 02-0966494 (Mon-Fri 8:00-18:00)
• LINE OA: @mysave
• Email: support@mysave.cc
• Facebook: facebook.com/mysave

We're here to help! 😊`;

            await this.sendReply(event.replyToken, message);
        }
    }
}

// Export singleton instance
const messageHandler = new MessageHandler();
export default messageHandler;
