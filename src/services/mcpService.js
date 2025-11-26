import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * MCP Service - Manages FAQ document as an MCP resource
 * Provides interface for reading and caching FAQ content
 */
class MCPService {
    constructor() {
        this.faqPath = process.env.FAQ_FILE_PATH || path.join(__dirname, '../../data/faq.md');
        this.faqCache = null;
        this.lastLoadTime = null;
        this.cacheTTL = 5 * 60 * 1000; // 5 minutes cache
    }

    /**
     * Get FAQ content, using cache if available and valid
     * @returns {Promise<string>} FAQ content
     */
    async getFAQContent() {
        const now = Date.now();

        // Return cached content if available and not expired
        if (this.faqCache && this.lastLoadTime && (now - this.lastLoadTime < this.cacheTTL)) {
            console.log('[MCP Service] Using cached FAQ content');
            return this.faqCache;
        }

        // Load fresh content
        try {
            console.log(`[MCP Service] Loading FAQ from: ${this.faqPath}`);
            const content = await fs.readFile(this.faqPath, 'utf-8');

            // Update cache
            this.faqCache = content;
            this.lastLoadTime = now;

            console.log(`[MCP Service] FAQ loaded successfully (${content.length} characters)`);
            return content;
        } catch (error) {
            console.error('[MCP Service] Error loading FAQ:', error.message);

            // Return cached content if available, even if expired
            if (this.faqCache) {
                console.log('[MCP Service] Using stale cache due to load error');
                return this.faqCache;
            }

            throw new Error(`Failed to load FAQ document: ${error.message}`);
        }
    }

    /**
     * Clear the FAQ cache (useful for testing or manual refresh)
     */
    clearCache() {
        console.log('[MCP Service] Clearing FAQ cache');
        this.faqCache = null;
        this.lastLoadTime = null;
    }

    /**
     * Get FAQ metadata
     * @returns {Object} FAQ metadata
     */
    getResourceMetadata() {
        return {
            name: 'Customer Service FAQ',
            uri: `file://${this.faqPath}`,
            mimeType: 'text/markdown',
            description: 'Comprehensive FAQ document for customer service automation',
            lastLoaded: this.lastLoadTime ? new Date(this.lastLoadTime).toISOString() : null,
            cached: !!this.faqCache
        };
    }
}

// Export singleton instance
const mcpService = new MCPService();
export default mcpService;
