// Quick test script to verify webhook endpoint
import https from 'https';

const ngrokUrl = 'https://nonsecretly-unclinging-anne.ngrok-free.dev';

// Test 1: GET request to root (should work)
console.log('Test 1: Testing root endpoint...');
https.get(`${ngrokUrl}/`, (res) => {
    console.log(`✅ Root endpoint status: ${res.statusCode}`);
}).on('error', (err) => {
    console.log(`❌ Root endpoint error: ${err.message}`);
});

// Test 2: POST request to webhook (what LINE does)
console.log('\nTest 2: Testing webhook endpoint (simulating LINE)...');
const postData = JSON.stringify({
    events: []
});

const options = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length,
        'x-line-signature': 'test-signature'
    }
};

const req = https.request(`${ngrokUrl}/webhook`, options, (res) => {
    console.log(`Status: ${res.statusCode}`);

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Response:', data);
        if (res.statusCode === 401 || res.statusCode === 403) {
            console.log('\n⚠️  Got 401/403 - This is expected! It means:');
            console.log('   - Webhook endpoint is reachable ✅');
            console.log('   - LINE signature validation is working ✅');
            console.log('   - You need to verify LINE_CHANNEL_SECRET in .env matches LINE Console');
        } else if (res.statusCode === 200) {
            console.log('\n✅ Webhook is working!');
        } else {
            console.log(`\n❌ Unexpected status code: ${res.statusCode}`);
        }
    });
});

req.on('error', (err) => {
    console.log(`❌ Webhook endpoint error: ${err.message}`);
});

req.write(postData);
req.end();
