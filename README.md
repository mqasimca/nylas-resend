# nylas-resend

Drop-in replacement for the [Resend](https://resend.com) SDK that uses [Nylas Inbound](https://developer.nylas.com/docs/v3/getting-started/inbound/) under the hood.

**Migrate from Resend to Nylas in 5 minutes** — change just 2 lines of code.

[![npm version](https://img.shields.io/npm/v/nylas-resend.svg)](https://www.npmjs.com/package/nylas-resend)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Why Migrate to Nylas?

- **Unified Platform** — Send, receive, and manage emails from one API
- **Managed Inbound Addresses** — Get `inbox@your-app.nylas.email` instantly
- **Enterprise-Grade** — Built for scale with 99.99% uptime SLA
- **Same Developer Experience** — Keep your existing code patterns

---

## Migration Compatibility

> **90% of Resend users can migrate seamlessly** with just 2 lines of code change.

### Quick Compatibility Check

| If you use... | Migration | Notes |
|---------------|-----------|-------|
| `emails.send()` with text/html | ✅ Seamless | No code changes needed |
| `emails.send()` with attachments | ✅ Seamless | Works identically |
| CC, BCC, reply_to | ✅ Seamless | Full support |
| Scheduled emails (`scheduled_at`) | ✅ Seamless | Full support |
| `emails.get()` / `emails.list()` | ✅ Seamless | Full support |
| Inbound webhooks (`email.received`) | ✅ Seamless | Use `handleInboundWebhook()` |
| Custom headers | ⚠️ Warning | Headers ignored, warning logged |
| Tags | ⚠️ Warning | Tags ignored, warning logged |
| React email templates | ❌ Change needed | Pre-render to HTML first |
| Resend templates | ❌ Change needed | Use your own templating |
| Domains API | ❌ Not applicable | Nylas uses Grants |
| Batch sending | ❌ Not available | Send individually |

### What Changes?

```diff
- import { Resend } from 'resend';
+ import { Resend } from 'nylas-resend';

- const resend = new Resend('re_123456789');
+ const resend = new Resend({
+   apiKey: process.env.NYLAS_API_KEY,
+   grantId: process.env.NYLAS_GRANT_ID
+ });

// Everything else stays the same!
const { data, error } = await resend.emails.send({
  from: 'you@example.com',
  to: 'user@example.com',
  subject: 'Hello',
  html: '<p>World</p>'
});
```

---

## Table of Contents

- [Migration Compatibility](#migration-compatibility)
- [Installation](#installation)
- [Migration Guide](#migration-guide)
  - [Step 1: Get Nylas Credentials](#step-1-get-nylas-credentials)
  - [Step 2: Install the Adapter](#step-2-install-the-adapter)
  - [Step 3: Update Your Code](#step-3-update-your-code)
  - [Step 4: Update Webhook Handler](#step-4-update-webhook-handler)
- [Complete Examples](#complete-examples)
  - [Sending Emails](#sending-emails)
  - [Sending with Attachments](#sending-with-attachments)
  - [Sending to Multiple Recipients](#sending-to-multiple-recipients)
  - [Scheduled Emails](#scheduled-emails)
  - [Handling Inbound Emails](#handling-inbound-emails)
- [API Reference](#api-reference)
- [Error Handling](#error-handling)
- [TypeScript Support](#typescript-support)
- [FAQ](#faq)
- [Limitations](#limitations)

---

## Installation

```bash
npm install nylas-resend
```

---

## Migration Guide

### Step 1: Get Nylas Credentials

#### 1.1 Create a Nylas Account

1. Sign up at [dashboard.nylas.com](https://dashboard.nylas.com)
2. Create a new application
3. Copy your **API Key** from the dashboard

#### 1.2 Create an Inbound Mailbox (Grant)

Run this command to create a managed email address:

```bash
curl -X POST https://api.us.nylas.com/v3/grants \
  -H "Authorization: Bearer YOUR_NYLAS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "inbox",
    "settings": {
      "email": "inbox@your-app.nylas.email"
    }
  }'
```

**Response:**
```json
{
  "request_id": "abc-123",
  "data": {
    "id": "GRANT_ID_HERE",
    "provider": "inbox",
    "email": "inbox@your-app.nylas.email"
  }
}
```

Save the `id` — this is your **Grant ID**.

#### 1.3 Set Up Webhook (Optional - for receiving emails)

```bash
curl -X POST https://api.us.nylas.com/v3/webhooks \
  -H "Authorization: Bearer YOUR_NYLAS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "trigger_types": ["message.created"],
    "webhook_url": "https://your-app.com/webhook"
  }'
```

---

### Step 2: Install the Adapter

```bash
# Remove Resend (optional)
npm uninstall resend

# Install nylas-resend
npm install nylas-resend
```

---

### Step 3: Update Your Code

This is the only code change you need to make:

#### Before (Resend)

```typescript
import { Resend } from 'resend';

const resend = new Resend('re_123456789');
```

#### After (Nylas)

```typescript
import { Resend } from 'nylas-resend';

const resend = new Resend({
  apiKey: process.env.NYLAS_API_KEY,
  grantId: process.env.NYLAS_GRANT_ID
});
```

**That's it!** All your existing `resend.emails.send()` calls work without any changes.

---

### Step 4: Update Webhook Handler

If you're receiving inbound emails, wrap your webhook handler:

#### Before (Resend)

```typescript
app.post('/webhook', (req, res) => {
  const event = req.body;

  if (event.type === 'email.received') {
    console.log('From:', event.data.from);
    console.log('Subject:', event.data.subject);
  }

  res.sendStatus(200);
});
```

#### After (Nylas)

```typescript
import { handleInboundWebhook } from 'nylas-resend';

app.post('/webhook', (req, res) => {
  // Transform Nylas webhook to Resend format
  const event = handleInboundWebhook(req.body);

  if (event?.type === 'email.received') {
    // Same code as before!
    console.log('From:', event.data.from);
    console.log('Subject:', event.data.subject);
  }

  res.sendStatus(200);
});
```

---

## Complete Examples

### Sending Emails

#### Simple Text Email

```typescript
import { Resend } from 'nylas-resend';

const resend = new Resend({
  apiKey: process.env.NYLAS_API_KEY,
  grantId: process.env.NYLAS_GRANT_ID
});

async function sendWelcomeEmail(userEmail: string, userName: string) {
  const { data, error } = await resend.emails.send({
    from: 'welcome@your-app.com',
    to: userEmail,
    subject: `Welcome to Our App, ${userName}!`,
    text: `Hi ${userName},\n\nWelcome to our app! We're excited to have you.\n\nBest,\nThe Team`
  });

  if (error) {
    console.error('Failed to send:', error.message);
    return null;
  }

  console.log('Email sent! ID:', data.id);
  return data.id;
}
```

#### HTML Email

```typescript
const { data, error } = await resend.emails.send({
  from: 'notifications@your-app.com',
  to: 'user@example.com',
  subject: 'Your Weekly Summary',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Your Weekly Summary</h1>
      <p>Here's what happened this week:</p>
      <ul>
        <li>5 new sign-ups</li>
        <li>120 active users</li>
        <li>$1,234 in revenue</li>
      </ul>
      <a href="https://your-app.com/dashboard"
         style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
        View Dashboard
      </a>
    </div>
  `
});
```

---

### Sending with Attachments

```typescript
import { readFileSync } from 'fs';

const { data, error } = await resend.emails.send({
  from: 'invoices@your-app.com',
  to: 'customer@example.com',
  subject: 'Your Invoice #12345',
  html: '<p>Please find your invoice attached.</p>',
  attachments: [
    {
      filename: 'invoice-12345.pdf',
      content: readFileSync('./invoices/12345.pdf').toString('base64'),
      content_type: 'application/pdf'
    }
  ]
});
```

#### Multiple Attachments

```typescript
const { data, error } = await resend.emails.send({
  from: 'reports@your-app.com',
  to: 'manager@example.com',
  subject: 'Monthly Reports',
  text: 'Please find the monthly reports attached.',
  attachments: [
    {
      filename: 'sales-report.xlsx',
      content: salesReportBase64,
      content_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    },
    {
      filename: 'analytics.pdf',
      content: analyticsPdfBase64,
      content_type: 'application/pdf'
    },
    {
      filename: 'summary.csv',
      content: Buffer.from(csvContent).toString('base64'),
      content_type: 'text/csv'
    }
  ]
});
```

---

### Sending to Multiple Recipients

#### Multiple To Recipients

```typescript
const { data, error } = await resend.emails.send({
  from: 'team@your-app.com',
  to: [
    'alice@example.com',
    'bob@example.com',
    'charlie@example.com'
  ],
  subject: 'Team Meeting Tomorrow',
  text: 'Reminder: We have a team meeting tomorrow at 10 AM.'
});
```

#### With CC and BCC

```typescript
const { data, error } = await resend.emails.send({
  from: 'sales@your-app.com',
  to: 'client@example.com',
  cc: [
    'sales-team@your-app.com',
    'account-manager@your-app.com'
  ],
  bcc: 'records@your-app.com',
  reply_to: 'support@your-app.com',
  subject: 'Your Quote Request',
  html: '<p>Thank you for your interest! Here is your quote...</p>'
});
```

---

### Scheduled Emails

Send emails at a specific time in the future:

```typescript
const { data, error } = await resend.emails.send({
  from: 'reminders@your-app.com',
  to: 'user@example.com',
  subject: 'Your appointment is tomorrow',
  html: '<p>This is a reminder about your appointment tomorrow at 10 AM.</p>',
  scheduled_at: '2024-12-25T10:00:00Z'  // ISO 8601 format
});

if (data) {
  console.log('Email scheduled! ID:', data.id);
}
```

#### Schedule for a relative time

```typescript
// Send in 1 hour
const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000).toISOString();

const { data, error } = await resend.emails.send({
  from: 'notifications@your-app.com',
  to: 'user@example.com',
  subject: 'Follow-up',
  text: 'Just following up on our conversation.',
  scheduled_at: oneHourFromNow
});
```

---

### Handling Inbound Emails

#### Express.js Example

```typescript
import express from 'express';
import { handleInboundWebhook } from 'nylas-resend';

const app = express();
app.use(express.json());

app.post('/webhook', (req, res) => {
  const event = handleInboundWebhook(req.body);

  if (!event) {
    // Not a message.created webhook, ignore
    return res.sendStatus(200);
  }

  if (event.type === 'email.received') {
    const { from, to, subject, html, text, attachments } = event.data;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 New Email Received');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('From:', from);
    console.log('To:', to.join(', '));
    console.log('Subject:', subject);
    console.log('Body:', text || html);

    if (attachments?.length) {
      console.log('Attachments:', attachments.map(a => a.filename).join(', '));
    }

    // Process the email (e.g., save to database, trigger workflow, etc.)
    processInboundEmail(event.data);
  }

  res.sendStatus(200);
});

function processInboundEmail(emailData) {
  // Your business logic here
  // - Parse support tickets
  // - Process order confirmations
  // - Handle unsubscribe requests
  // - etc.
}

app.listen(3000, () => {
  console.log('Webhook server running on port 3000');
});
```

#### Next.js API Route Example

```typescript
// app/api/webhook/route.ts
import { NextResponse } from 'next/server';
import { handleInboundWebhook } from 'nylas-resend';

export async function POST(request: Request) {
  const body = await request.json();
  const event = handleInboundWebhook(body);

  if (event?.type === 'email.received') {
    const { from, subject, html } = event.data;

    // Save to database
    await db.emails.create({
      data: {
        from,
        subject,
        body: html,
        receivedAt: new Date()
      }
    });

    // Trigger notification
    await sendSlackNotification(`New email from ${from}: ${subject}`);
  }

  return NextResponse.json({ received: true });
}
```

#### Extracting Attachments

```typescript
import { handleInboundWebhook } from 'nylas-resend';

app.post('/webhook', async (req, res) => {
  const event = handleInboundWebhook(req.body);

  if (event?.type === 'email.received') {
    const { attachments } = event.data;

    if (attachments?.length) {
      for (const attachment of attachments) {
        console.log(`Processing attachment: ${attachment.filename}`);
        console.log(`  Type: ${attachment.content_type}`);
        console.log(`  Size: ${attachment.size} bytes`);

        // Note: To download attachment content, use the Nylas API directly
        // The webhook only includes metadata, not the actual file content
      }
    }
  }

  res.sendStatus(200);
});
```

---

## API Reference

### Constructor

```typescript
// With config object (recommended)
const resend = new Resend({
  apiKey: string,           // Required: Nylas API key
  grantId: string,          // Required: Nylas Grant ID
  baseUrl?: string          // Optional: API base URL (default: https://api.us.nylas.com)
});

// With API key string (requires NYLAS_GRANT_ID env var)
const resend = new Resend('nylas_api_key');
```

### resend.emails.send(options)

Send an email.

```typescript
const { data, error } = await resend.emails.send({
  from: string,                    // Required: Sender email
  to: string | string[],           // Required: Recipient(s)
  subject: string,                 // Required: Email subject
  text?: string,                   // Plain text body
  html?: string,                   // HTML body
  cc?: string | string[],          // CC recipients
  bcc?: string | string[],         // BCC recipients
  reply_to?: string | string[],    // Reply-to address(es)
  attachments?: Attachment[],      // File attachments
  scheduled_at?: string            // ISO 8601 datetime for scheduled send
});

// Returns: { data: { id: string }, error: null } or { data: null, error: Error }
```

### resend.emails.get(id)

Get an email by ID.

```typescript
const { data, error } = await resend.emails.get('email_id');

// Returns email object with: id, from, to, subject, html, text, created_at, etc.
```

### resend.emails.list(options?)

List emails.

```typescript
const { data, error } = await resend.emails.list({ limit: 10 });

// Returns: { object: 'list', data: Email[] }
```

### handleInboundWebhook(payload)

Transform Nylas webhook to Resend format.

```typescript
import { handleInboundWebhook } from 'nylas-resend';

const event = handleInboundWebhook(webhookPayload);
// Returns: InboundEmailEvent | null
```

---

## Error Handling

```typescript
const { data, error } = await resend.emails.send({
  from: 'sender@example.com',
  to: 'recipient@example.com',
  subject: 'Test',
  text: 'Hello'
});

if (error) {
  console.error('Error:', error.message);
  console.error('Type:', error.name);
  console.error('Status:', error.statusCode);

  // Handle specific errors
  switch (error.statusCode) {
    case 401:
      console.error('Invalid API key');
      break;
    case 400:
      console.error('Bad request:', error.message);
      break;
    case 429:
      console.error('Rate limited, retry later');
      break;
    default:
      console.error('Unexpected error');
  }

  return;
}

console.log('Success! Email ID:', data.id);
```

---

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import { Resend } from 'nylas-resend';
import type {
  SendEmailRequest,
  SendEmailResponse,
  GetEmailResponse,
  ListEmailsResponse,
  Attachment,
  InboundEmailEvent,
  WebhookEvent,
  ApiResponse,
  ResendConfig,
  ResendError
} from 'nylas-resend';

// Type-safe email sending
const request: SendEmailRequest = {
  from: 'sender@example.com',
  to: ['recipient@example.com'],
  subject: 'Typed Email',
  html: '<p>Hello!</p>',
  attachments: [
    {
      filename: 'doc.pdf',
      content: 'base64...',
      content_type: 'application/pdf'
    }
  ]
};

const response: ApiResponse<SendEmailResponse> = await resend.emails.send(request);
```

---

## FAQ

### Do I need to change all my email sending code?

**No!** Only change the import and initialization. All `resend.emails.send()` calls work exactly the same.

### What about the domain parameter?

Nylas uses `grantId` instead of domains. The adapter handles this automatically.

### Can I use my own domain?

Yes! Configure a custom domain in Nylas dashboard, then create a grant with your domain's email address.

### Are webhook payloads identical?

The `handleInboundWebhook()` function transforms Nylas webhooks to match Resend's format exactly, so your existing webhook handling code works unchanged.

### What's the API mapping?

| Resend | Nylas |
|--------|-------|
| `resend.emails.send()` | `POST /v3/grants/{id}/messages/send` |
| `resend.emails.get(id)` | `GET /v3/grants/{id}/messages/{mid}` |
| `resend.emails.list()` | `GET /v3/grants/{id}/messages` |
| Webhook `email.received` | Webhook `message.created` |

### How do I use EU region?

```typescript
const resend = new Resend({
  apiKey: process.env.NYLAS_API_KEY,
  grantId: process.env.NYLAS_GRANT_ID,
  baseUrl: 'https://api.eu.nylas.com'
});
```

---

## Limitations

Some Resend features are not supported by the Nylas API:

| Feature | Status | Notes |
|---------|--------|-------|
| `headers` | ⚠️ Not supported | Custom headers are ignored (warning logged). Use raw MIME format via Nylas SDK for custom headers. |
| `tags` | ⚠️ Not supported | Tags are ignored (warning logged). Nylas does not have a tags feature. |
| `react` | ❌ Not supported | Pre-render React components to HTML before sending. |
| `template` | ❌ Not supported | Nylas does not have a template system. Use your own templating. |
| Domains API | ❌ Not applicable | Nylas uses Grants instead of Domains. |
| Contacts/Audiences | ❌ Not applicable | Not available in Nylas Inbound. |
| Batch sending | ❌ Not implemented | Send emails individually. |
| `Idempotency-Key` | ❌ Not supported | Implement idempotency in your application layer. |

### Feature Support Matrix

| Feature | Supported | Notes |
|---------|-----------|-------|
| `from`, `to`, `cc`, `bcc` | ✅ | Full support |
| `reply_to` | ✅ | Full support |
| `subject`, `text`, `html` | ✅ | Full support |
| `attachments` | ✅ | Base64 or Buffer content |
| `scheduled_at` | ✅ | Maps to Nylas `send_at` |
| `emails.send()` | ✅ | Full support |
| `emails.get(id)` | ✅ | Full support |
| `emails.list()` | ✅ | Full support |
| Inbound webhooks | ✅ | `message.created` → `email.received` |
| Webhook signature verification | ⚠️ | Placeholder - implement HMAC-SHA256 or use Nylas SDK |

---

## Environment Variables

```bash
# .env
NYLAS_API_KEY=your_api_key_here
NYLAS_GRANT_ID=your_grant_id_here

# Optional
NYLAS_API_URL=https://api.eu.nylas.com  # For EU region
```

---

## License

MIT

---

## Links

- [Nylas Inbound Documentation](https://developer.nylas.com/docs/v3/getting-started/inbound/)
- [Nylas API Reference](https://developer.nylas.com/docs/api/v3/ecc/)
- [Nylas Dashboard](https://dashboard.nylas.com)
- [Resend Documentation](https://resend.com/docs) (for API compatibility reference)
