import OpenAI from 'openai';

/**
 * AI Service - Generates responses using OpenAI with FAQ context
 * Now supports TEST_MODE for testing without OpenAI API
 */
class AIService {
    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY;
        this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
        this.testMode = process.env.TEST_MODE === 'true';

        if (this.testMode) {
            console.warn('[AI Service] 🧪 TEST MODE ENABLED - Using mock responses instead of OpenAI');
        } else if (!this.apiKey || this.apiKey === 'your_openai_api_key_here') {
            console.warn('[AI Service] WARNING: OpenAI API key not configured. AI responses will fail.');
            console.warn('[AI Service] TIP: Set TEST_MODE=true in .env to use mock responses for testing');
        }

        this.client = new OpenAI({
            apiKey: this.apiKey
        });
    }

    /**
     * Generate AI response based on user question and FAQ context
     * @param {string} userQuestion - The user's question
     * @param {string} faqContent - The FAQ document content
     * @returns {Promise<Object>} Response object with text and metadata
     */
    async generateResponse(userQuestion, faqContent) {
        // If TEST_MODE is enabled, use mock responses
        if (this.testMode) {
            return this.generateMockResponse(userQuestion);
        }

        try {
            console.log(`[AI Service] Generating response for question: "${userQuestion}"`);

            const systemPrompt = this.buildSystemPrompt(faqContent);
            const userPrompt = this.buildUserPrompt(userQuestion);

            const completion = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 500
            });

            const responseText = completion.choices[0].message.content;
            const wasAutoResolved = !this.isEscalationResponse(responseText);

            console.log(`[AI Service] Response generated (auto-resolved: ${wasAutoResolved})`);

            return {
                text: responseText,
                autoResolved: wasAutoResolved,
                model: this.model,
                usage: completion.usage
            };
        } catch (error) {
            console.error('[AI Service] Error generating response:', error.message);

            // Return fallback response
            return {
                text: 'ขออภัยค่ะ ระบบมีปัญหาชั่วคราว กรุณาติดต่อทีมงานของเราโดยตรงที่ support@shippop.com หรือโทร 02-xxx-xxxx ค่ะ\n\nSorry, we are experiencing technical difficulties. Please contact our support team directly at support@shippop.com or call 02-xxx-xxxx.',
                autoResolved: false,
                error: error.message
            };
        }
    }

    /**
     * Generate mock response for testing (when TEST_MODE=true)
     * @param {string} userQuestion - User's question
     * @returns {Promise<Object>} Mock response
     */
    async generateMockResponse(userQuestion) {
        console.log(`[AI Service] 🧪 Generating MOCK response for: "${userQuestion}"`);

        const lowerQuestion = userQuestion.toLowerCase();

        // Detect question topic and provide canned response
        if (lowerQuestion.includes('ราคา') || lowerQuestion.includes('rate') ||
            lowerQuestion.includes('ค่าส่ง') || lowerQuestion.includes('cost') ||
            lowerQuestion.includes('price') || lowerQuestion.includes('เท่าไหร่')) {
            return {
                text: `🚚 อัตราค่าจัดส่ง Shippop:\n\n📍 กรุงเทพฯ: 50 บาท (น้ำหนัก 0-2 กก.)\n📍 ต่างจังหวัด: 80 บาท (น้ำหนัก 0-2 กก.)\n\n✨ บริการเพิ่มเติม:\n• COD: +25 บาท\n• Express: +50 บาท\n• Same Day (กทม.): 150 บาท\n\nสอบถามเพิ่มเติม: support@shippop.com, LINE: @shippop\n\n---\n\n🚚 Shippop Shipping Rates:\n\n📍 Bangkok: 50 THB (0-2kg)\n📍 Provinces: 80 THB (0-2kg)\n\nAdditional services:\n• COD: +25 THB\n• Express: +50 THB\n• Same Day (BKK): 150 THB`,
                autoResolved: true,
                model: 'mock',
                testMode: true
            };
        } else if (lowerQuestion.includes('นาน') || lowerQuestion.includes('delivery') ||
            lowerQuestion.includes('ส่ง') || lowerQuestion.includes('long') ||
            lowerQuestion.includes('time')) {
            return {
                text: `⏰ ระยะเวลาการจัดส่ง:\n\n📦 กรุงเทพฯ: 1-2 วันทำการ\n📦 ภาคกลาง: 2-3 วันทำการ\n📦 ต่างจังหวัด: 3-5 วันทำการ\n📦 พื้นที่ห่างไกล: 4-7 วันทำการ\n\n🚀 Express จัดส่งเร็วขึ้น 1-2 วัน\n⚡ Same Day (กทม. สั่งก่อน 12:00)\n\n---\n\n⏰ Delivery Time:\n\n📦 Bangkok: 1-2 days\n📦 Central: 2-3 days\n📦 Provinces: 3-5 days\n📦 Remote: 4-7 days`,
                autoResolved: true,
                model: 'mock',
                testMode: true
            };
        } else if (lowerQuestion.includes('track') || lowerQuestion.includes('ติดตาม') ||
            lowerQuestion.includes('เช็ค') || lowerQuestion.includes('check')) {
            return {
                text: `📍 วิธีติดตามพัสดุ:\n\n1️⃣ เว็บไซต์: shippop.com/tracking\n2️⃣ แอพ Shippop\n3️⃣ เลขติดตามที่ส่งทาง SMS/Email\n4️⃣ โทร: 02-xxx-xxxx\n\n💡 เลขพัสดุถูกส่งภายใน 2 ชม.หลังรับของ\n\n---\n\n📍 How to Track:\n\n1️⃣ Website: shippop.com/tracking\n2️⃣ Shippop App\n3️⃣ Tracking number (SMS/Email)\n4️⃣ Call: 02-xxx-xxxx`,
                autoResolved: true,
                model: 'mock',
                testMode: true
            };
        } else {
            // Unknown question - escalate
            return {
                text: `สวัสดีค่ะ! ขออภัยด้วยนะคะ คำถามนี้อาจต้องให้ทีมงานช่วยตอบโดยตรง\n\n📞 ช่องทางติดต่อทีมงาน Shippop:\n• โทร: 02-xxx-xxxx (จ-ศ 8:00-18:00)\n• อีเมล: support@shippop.com\n• LINE: @shippop\n• Facebook: facebook.com/shippop\n\n---\n\nHello! I apologize, but this question needs our team to answer directly.\n\n📞 Contact Shippop Support:\n• Call: 02-xxx-xxxx (Mon-Fri 8:00-18:00)\n• Email: support@shippop.com\n• LINE: @shippop\n• Facebook: facebook.com/shippop`,
                autoResolved: false,
                model: 'mock',
                testMode: true
            };
        }
    }

    /**
     * Build system prompt with FAQ context
     * @param {string} faqContent - FAQ document content
     * @returns {string} System prompt
     */
    buildSystemPrompt(faqContent) {
        return `You are a helpful customer service assistant for Shippop, a leading logistics and shipping company in Thailand.

Your role:
- Answer customer questions using ONLY the information provided in the FAQ document below
- Be friendly, professional, and concise in Thai and English (respond in the same language as the question)
- If the answer is in the FAQ, provide it clearly and accurately
- If the information is NOT in the FAQ, politely say you don't have that information and offer to escalate to a human agent
- Never make up information or provide answers not supported by the FAQ
- Keep responses under 200 words

FAQ Document:
${faqContent}

Important Instructions:
- Always be helpful and empathetic
- Use clear, simple language
- For questions about specific orders or personal information, always suggest contacting support directly
- Provide contact information when escalating: support@shippop.com or LINE: @shippop`;
    }

    /**
     * Build user prompt
     * @param {string} question - User's question
     * @returns {string} User prompt
     */
    buildUserPrompt(question) {
        return `Customer question: ${question}

Please provide a helpful answer based on the FAQ. If the FAQ doesn't contain the answer, politely let the customer know and suggest contacting our support team.`;
    }

    /**
     * Check if response indicates escalation to human
     * @param {string} response - AI response text
     * @returns {boolean} True if escalation detected
     */
    isEscalationResponse(response) {
        const escalationKeywords = [
            'contact our support',
            'contact support',
            'human agent',
            'ติดต่อทีม',
            'ติดต่อฝ่าย',
            'don\'t have that information',
            'not in the FAQ',
            'cannot answer',
            'ไม่มีข้อมูล'
        ];

        const lowerResponse = response.toLowerCase();
        return escalationKeywords.some(keyword => lowerResponse.includes(keyword.toLowerCase()));
    }

    /**
     * Health check for AI service
     * @returns {Object} Service health status
     */
    getHealthStatus() {
        return {
            configured: this.testMode || (!!this.apiKey && this.apiKey !== 'your_openai_api_key_here'),
            model: this.testMode ? 'mock' : this.model,
            provider: this.testMode ? 'Mock (Test Mode)' : 'OpenAI',
            testMode: this.testMode
        };
    }
}

// Export singleton instance
const aiService = new AIService();
export default aiService;
