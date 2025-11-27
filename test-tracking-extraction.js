// Test tracking number extraction with various formats
import intentClassifier from './src/services/intentClassifier.js';

const testCases = [
    { message: 'ติดตาม TH014781D6JD0B', expected: 'TH014781D6JD0B' },
    { message: 'track 7228112769731265', expected: '7228112769731265' },
    { message: 'เช็คพัสดุ SHIPBA4361694', expected: 'SHIPBA4361694' },
    { message: 'ตรวจสอบ WB047589355TH', expected: 'WB047589355TH' },
    { message: 'JA189166117TH ถึงไหนแล้ว', expected: 'JA189166117TH' },
    { message: 'ติดตามพัสดุ SHIPDOF4365892', expected: 'SHIPDOF4365892' },
    { message: 'check 66850951056944', expected: '66850951056944' },
    // Edge cases
    { message: 'TH04027XD7PE2F', expected: 'TH04027XD7PE2F' },
    { message: 'SPXTH051981188579', expected: 'SPXTH051981188579' },
    { message: 'ติดตาม', expected: null }, // No tracking number
    { message: 'ของฉัน', expected: null },
];

console.log('🧪 Testing Tracking Number Extraction\n');
console.log('='.repeat(70));

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
    const intent = intentClassifier.classifyIntent(testCase.message);
    const extracted = intent.trackingNumber;
    const isCorrect = extracted === testCase.expected;

    const status = isCorrect ? '✅ PASS' : '❌ FAIL';
    const color = isCorrect ? '' : ' ⚠️';

    console.log(`\n${status}${color}`);
    console.log(`  Message:  "${testCase.message}"`);
    console.log(`  Expected: ${testCase.expected || '(none)'}`);
    console.log(`  Extracted: ${extracted || '(none)'}`);

    if (isCorrect) {
        passed++;
    } else {
        failed++;
    }
}

console.log('\n' + '='.repeat(70));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);

if (failed === 0) {
    console.log('✅ All tests passed!\n');
} else {
    console.log('❌ Some tests failed. Review the pattern.\n');
}
