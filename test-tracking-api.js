// Quick test script to verify tracking API integration
import trackingService from './src/services/trackingService.js';

const testTrackingNumbers = [
    'TH04027XD7PE2F',
    'SPXTH051981188579',
    'TH0151818MCN3B',
    '7227115611892065'
];

console.log('🧪 Testing Tracking API Integration\n');
console.log('='.repeat(60));

for (const trackingNumber of testTrackingNumbers) {
    console.log(`\n📦 Testing: ${trackingNumber}`);
    console.log('-'.repeat(60));

    try {
        const result = await trackingService.getTrackingInfo(trackingNumber);

        if (result.found) {
            console.log(`✅ FOUND`);
            console.log(`   Courier: ${result.courier}`);
            console.log(`   Status: ${result.statusTH} (${result.statusEN})`);
            console.log(`   Location: ${result.locationTH}`);
            console.log(`   Updated: ${result.timestamp}`);
        } else {
            console.log(`❌ NOT FOUND`);
            console.log(`   Error: ${result.error}`);
        }
    } catch (error) {
        console.log(`❌ ERROR: ${error.message}`);
    }
}

console.log('\n' + '='.repeat(60));
console.log('✅ Test complete!\n');
