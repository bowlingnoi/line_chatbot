/**
 * Analytics Service - Track bot performance and CS case reduction metrics
 */
class Analytics {
    constructor() {
        this.metrics = {
            totalQueries: 0,
            autoResolved: 0,
            escalated: 0,
            errors: 0,
            startTime: new Date()
        };

        this.queryLog = [];
        this.maxLogSize = 100; // Keep last 100 queries
    }

    /**
     * Track a customer query
     * @param {Object} data - Query data
     */
    trackQuery(data) {
        const { question, wasAutoResolved, error } = data;

        this.metrics.totalQueries++;

        if (error) {
            this.metrics.errors++;
        } else if (wasAutoResolved) {
            this.metrics.autoResolved++;
        } else {
            this.metrics.escalated++;
        }

        // Add to query log
        this.queryLog.push({
            timestamp: new Date(),
            question: question.substring(0, 100), // Limit length
            autoResolved: wasAutoResolved,
            error: error || null
        });

        // Keep log size manageable
        if (this.queryLog.length > this.maxLogSize) {
            this.queryLog.shift();
        }

        // Log summary periodically (every 10 queries)
        if (this.metrics.totalQueries % 10 === 0) {
            this.printSummary();
        }
    }

    /**
     * Get current metrics
     * @returns {Object} Current analytics metrics
     */
    getMetrics() {
        const resolutionRate = this.metrics.totalQueries > 0
            ? (this.metrics.autoResolved / this.metrics.totalQueries * 100).toFixed(2)
            : 0;

        const escalationRate = this.metrics.totalQueries > 0
            ? (this.metrics.escalated / this.metrics.totalQueries * 100).toFixed(2)
            : 0;

        const errorRate = this.metrics.totalQueries > 0
            ? (this.metrics.errors / this.metrics.totalQueries * 100).toFixed(2)
            : 0;

        const uptime = Math.floor((new Date() - this.metrics.startTime) / 1000 / 60); // minutes

        return {
            ...this.metrics,
            resolutionRate: parseFloat(resolutionRate),
            escalationRate: parseFloat(escalationRate),
            errorRate: parseFloat(errorRate),
            uptimeMinutes: uptime
        };
    }

    /**
     * Print analytics summary to console
     */
    printSummary() {
        const metrics = this.getMetrics();

        console.log('\n========================================');
        console.log('📊 ANALYTICS SUMMARY');
        console.log('========================================');
        console.log(`Total Queries:      ${metrics.totalQueries}`);
        console.log(`✅ Auto-Resolved:   ${metrics.autoResolved} (${metrics.resolutionRate}%)`);
        console.log(`👤 Escalated:       ${metrics.escalated} (${metrics.escalationRate}%)`);
        console.log(`❌ Errors:          ${metrics.errors} (${metrics.errorRate}%)`);
        console.log(`⏱️  Uptime:          ${metrics.uptimeMinutes} minutes`);
        console.log('========================================\n');
    }

    /**
     * Get recent query history
     * @param {number} limit - Number of recent queries to return
     * @returns {Array} Recent queries
     */
    getRecentQueries(limit = 10) {
        return this.queryLog.slice(-limit);
    }

    /**
     * Calculate estimated CS time saved
     * Assumes 15 minutes average handling time per ticket
     * @returns {Object} Time/cost savings
     */
    calculateSavings() {
        const avgHandlingTimeMinutes = 15;
        const avgHourlyRate = 20; // USD per hour

        const timesSavedMinutes = this.metrics.autoResolved * avgHandlingTimeMinutes;
        const hoursSaved = timesSavedMinutes / 60;
        const costSaved = hoursSaved * avgHourlyRate;

        return {
            autoResolvedCases: this.metrics.autoResolved,
            minutesSaved: timesSavedMinutes,
            hoursSaved: hoursSaved.toFixed(2),
            estimatedCostSaved: costSaved.toFixed(2),
            currency: 'USD'
        };
    }

    /**
     * Reset all metrics (useful for testing)
     */
    reset() {
        this.metrics = {
            totalQueries: 0,
            autoResolved: 0,
            escalated: 0,
            errors: 0,
            startTime: new Date()
        };
        this.queryLog = [];
        console.log('[Analytics] Metrics reset');
    }
}

// Export singleton instance
const analytics = new Analytics();
export default analytics;
