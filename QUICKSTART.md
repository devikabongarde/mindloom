# 🚀 WhatsApp Bot - Quick Start

## What Was Implemented

✅ Full command-based WhatsApp bot with 4 commands:
- `/shelves` - List all shelves
- `/shelf [name]` - View links in a shelf  
- `/report [subject]` - AI study report
- `/pdf [shelf name]` - Generate & send PDF

✅ PDF generation service using pdfkit
✅ Phone number support in User model & Profile UI
✅ Async PDF generation with follow-up messages
✅ Helper functions for user/shelf lookup

## Files Modified/Created

### Created:
- `/server/services/pdf.service.js` - PDF generation
- `/server/public/pdfs/` - PDF storage directory
- `/server/test-pdf.js` - Test script
- `WHATSAPP_BOT_IMPLEMENTATION.md` - Technical docs
- `WHATSAPP_BOT_GUIDE.md` - User guide

### Modified:
- `/server/controllers/whatsapp.controller.js` - Full rewrite with all commands
- `/server/.env` - Added BACKEND_URL

### Already Existed (No Changes Needed):
- `/server/models/User.js` - Phone field ✓
- `/client/src/pages/Profile.jsx` - Phone input ✓
- `/server/server.js` - Static file serving ✓
- `/server/package.json` - pdfkit installed ✓

## Test It Now

### 1. Start the server
```bash
cd server
npm start
```

### 2. Test PDF generation (optional)
```bash
node test-pdf.js
```

### 3. Add your phone number
- Go to http://localhost:5173/profile
- Click Settings → Edit Profile
- Add phone: `+14155551234` (your WhatsApp number)
- Save

### 4. Connect to Twilio
Send to `+1 (415) 523-8886`:
```
join [your-sandbox-code]
```

### 5. Try commands
```
/shelves
/shelf [your-shelf-name]
/report
/pdf [your-shelf-name]
```

## Environment Setup

Your `.env` already has:
```env
TWILIO_ACCOUNT_SID=ACd9a49cc2612e8ea1e198347c2b6a1911
TWILIO_AUTH_TOKEN=d5fe0d0195be007254965c8fdb2354d1
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
BACKEND_URL=http://localhost:5000
```

For production/ngrok, update `BACKEND_URL` to your public URL.

## How It Works

1. **User sends WhatsApp message** → Twilio receives it
2. **Twilio POSTs to webhook** → `/api/whatsapp/webhook`
3. **Controller parses command** → Routes to appropriate handler
4. **Handler executes logic** → Queries DB, generates PDF, etc.
5. **Returns TwiML response** → Twilio sends back to user

For `/pdf` command:
- Immediate response: "Generating PDF..."
- Async PDF generation
- Follow-up message with download link

## Command Examples

```bash
# List shelves
/shelves
→ Shows all shelves with link counts

# View shelf
/shelf Research
→ Shows 8 recent links with summaries

# Study report
/report dbms
→ AI-generated study insights

# Generate PDF
/pdf Research
→ Creates PDF and sends download link
```

## Troubleshooting

**"We couldn't find your account"**
- Add phone number to profile first
- Format: `+[country][number]` (e.g., `+14155551234`)

**"Shelf not found"**
- Use `/shelves` to see exact names
- Matching is case-insensitive

**PDF not accessible**
- Check `BACKEND_URL` in `.env`
- Verify `/server/public/pdfs/` exists
- Check server logs for errors

## Next Steps

1. ✅ Test all commands locally
2. ✅ Verify PDF generation works
3. ✅ Test with real WhatsApp number
4. 🔄 Deploy to production (update BACKEND_URL)
5. 🔄 Configure Twilio webhook for production
6. 🔄 Test in production environment

## Production Deployment

1. Deploy backend to your hosting service
2. Update `.env`:
   ```env
   BACKEND_URL=https://your-backend.com
   ```
3. Configure Twilio webhook:
   ```
   https://your-backend.com/api/whatsapp/webhook
   ```
4. Test all commands in production

## Code Structure

```
WhatsApp Message
    ↓
Twilio Webhook (POST /api/whatsapp/webhook)
    ↓
whatsapp.controller.js
    ├─ findUserByPhone() → User lookup
    ├─ findShelf() → Shelf matching
    └─ Command Router:
        ├─ /shelves → List shelves
        ├─ /shelf → Show links
        ├─ /report → AI report
        ├─ /pdf → Generate PDF
        └─ default → Help message
    ↓
TwiML Response → Twilio → User
```

## Dependencies

All already installed:
- `pdfkit` - PDF generation
- `twilio` - WhatsApp API
- `express` - Web server
- `mongoose` - Database

## Support

- See `WHATSAPP_BOT_GUIDE.md` for user documentation
- See `WHATSAPP_BOT_IMPLEMENTATION.md` for technical details
- Check server logs for debugging

---

**Ready to test! 🎉**
