# Real Tracking API Integration - Complete ✅

## Summary

Successfully integrated the real MySave tracking API into the LINE bot with full support for:

✅ **Real API Integration** - Calls `https://api-bi.my-group.net/v1/callback-gateway/express/trackings`
✅ **Multi-Courier Support** - Flash, Shopee, J&T, Kerry, Thailand Post, etc.
✅ **Complete Status Tracking** - BOOKED, PICKED, TRANSIT, DELIVERED, FAILED, RETURNED
✅ **Location Display** - Current location and full tracking history
✅ **Thai DateTime Format** - Buddhist year and Thai months
✅ **Bilingual Messages** - Thai and English in one message
✅ **Error Handling** - Graceful fallback when tracking not found

## How It Works

### Flow

```
User: "ติดตาม TH04027XD7PE2F"
    ↓
[Intent Classifier] → TRACKING intent detected
    ↓
[Message Handler] → handleTrackingMessage()
    ↓
[Tracking Service] → Call Real API
    ↓
    GET https://api-bi.my-group.net/v1/callback-gateway/express/trackings?courier_tracking_numbers=TH04027XD7PE2F
    ↓
[Parse Response]
    • Status: DELIVERED
    • Location: คลองหก, คลองหลวง, ปทุมธานี
    • Time: 31 ต.ค. 2568 เวลา 15:32 น.
    • Courier: Flash Express
    ↓
[Format Message] → Bilingual response with emoji
    ↓
[Send to User]
```

## Test Tracking Numbers

You can test with these real tracking numbers:

| Tracking Number | Courier | Status |
|----------------|---------|---------|
| `TH04027XD7PE2F` | Flash Express | DELIVERED |
| `SPXTH051981188579` | Shopee Express | DELIVERED |
| `TH0151818MCN3B` | - | (test this) |
| `7227115611892065` | - | (test this) |

## Example Response

When user sends: **"ติดตาม TH04027XD7PE2F"**

Bot replies:
```
✅ สถานะพัสดุ / Package Status

🔢 เลขพัสดุ / Tracking: TH04027XD7PE2F
📦 ขนส่ง / Courier: Flash Express

📍 สถานะปัจจุบัน / Current Status:
จัดส่งสำเร็จ
Delivered

📍 ตำแหน่ง / Location:
คลองหก, คลองหลวง, ปทุมธานี

⏰ อัพเดทล่าสุด / Last Update:
31 ต.ค. 2568 เวลา 15:32 น.

💬 รายละเอียด:
Your parcel has been delivered and signed by In Person. Thank you for using Flash Express service.

✅ มีหลักฐานการเซ็นรับ

📋 ประวัติล่าสุด / Recent History:
1. 31/10 15:32 - จัดส่งสำเร็จ
   คลองหก, คลองหลวง, ปทุมธานี
2. 31/10 14:27 - กำลังจัดส่ง
   คลองหก, คลองหลวง, ปทุมธานี
3. 31/10 11:53 - กำลังขนส่ง
   [KGE_SP] คลองเจ็ด

📞 ติดต่อ / Contact: 02-0966494 | LINE: @mysave
```

## Features

### 1. Status Emoji Mapping
- 📋 BOOKED - Order Placed
- 📦 PICKED - Picked Up
- 🚚 TRANSIT - In Transit
- ✅ DELIVERED - Delivered
- ❌ FAILED - Delivery Failed
- ↩️ RETURNED - Returned

### 2. Courier Display Names
Automatically converts codes to friendly names:
- FLASH → Flash Express
- SHOPEE → Shopee Express (SPX)
- JT → J&T Express
- KERRY → Kerry Express
- etc.

### 3. Thai Buddhist Calendar
Converts timestamps to Thai format:
- 2025-10-31 15:32 → 31 ต.ค. 2568 เวลา 15:32 น.

### 4. Tracking History
Shows last 3 events with:
- Date/time
- Status description
- Location (if available)

### 5. Delivery Proof
If package is delivered and has signature, shows: "✅ มีหลักฐานการเซ็นรับ"

## Configuration

Add to your `.env` file:

```bash
# Enable real tracking API (default: true)
USE_REAL_TRACKING_API=true

# API endpoint (default is MySave API)
TRACKING_API_ENDPOINT=https://api-bi.my-group.net/v1/callback-gateway/express/trackings
```

To test without real API:
```bash
USE_REAL_TRACKING_API=false
```

## Testing

### 1. Send a Tracking Query

In LINE app, send to your bot:
```
ติดตาม TH04027XD7PE2F
```

Or in English:
```
track SPXTH051981188579
```

### 2. Check Server Logs

You'll see:
```
[Intent] Type: TRACKING, Confidence: 0.98
[Tracking Service] Looking up: TH04027XD7PE2F
[Tracking Service] Calling API: https://api-bi.my-group.net/v1/callback-gateway/express/trackings?courier_tracking_numbers=TH04027XD7PE2F
[Message Handler] Tracking response sent (found: true)
```

### 3. Test Not Found

Send invalid tracking number:
```
ติดตาม INVALID123
```

Bot will reply:
```
❌ ไม่พบข้อมูลพัสดุ

🔢 เลขพัสดุ: INVALID123

Tracking number not found

กรุณาตรวจสอบ:
• เลขพัสดุถูกต้องหรือไม่
• พัสดุอาจยังไม่ถูกสแกนเข้าระบบ (รอ 2-4 ชม.)
...
```

## Files Modified

1. **[`src/services/trackingService.js`](file:///Users/bowlingnoi/Project/shippop-mysave.cc/my_adhoc/line_mcp/src/services/trackingService.js)**
   - Integrated real API calls
   - Complete response parsing
   - Status mapping and emoji
   - Thai datetime formatting
   - Bilingual message formatting

2. **[`.env.example`](file:///Users/bowlingnoi/Project/shippop-mysave.cc/my_adhoc/line_mcp/.env.example)**
   - Added tracking API configuration

## Next Steps

**Restart server to activate changes:**

```bash
# Press Ctrl+C in terminal running npm start
npm start
```

Then test with the real tracking numbers provided! 🎉
