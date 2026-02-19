# Bot Router - WhatsApp Webhook Management System

מערכת ניהול וובהוקים לוואטסאפ עסקי עם תמיכה ב-n8n.

## Features

- ניתוב וובהוקים לפי מספר טלפון
- ניהול בוטים (הוספה/עדכון/מחיקה)
- רשימות חסימה גלובליות
- רשימות לבנות לכל בוט
- מצבי גישה: כולם / רשימה לבנה / שאילתה דינאמית
- תזמון פעילות (מתי-עד)
- השהיה לפני תגובה
- לוג הודעות (livechat)
- אינטגרציה עם n8n

## Quick Start

### עם PostgreSQL חדש (docker-compose מלא):
```bash
cp .env.example .env
# ערוך את .env עם הסיסמאות שלך
docker-compose up -d
```

### עם PostgreSQL קיים:
```bash
# צור את הדאטאבייס
psql -U postgres -f scripts/create-db.sql

# הרץ את המיגרציות
psql -U bot_router_user -d bot_router -f src/db/schema.sql

# הרץ את האפליקציה
cp .env.example .env
docker-compose -f docker-compose.external-db.yml up -d
```

## API Endpoints

### Webhooks
- `POST /webhook` - קבלת וובהוקים מ-WhatsApp Business API
- `GET /webhook` - וריפיקציה של webhook

### Bots Management
- `GET /api/bots` - רשימת כל הבוטים
- `GET /api/bots/:id` - בוט ספציפי
- `POST /api/bots` - יצירת בוט חדש
- `PUT /api/bots/:id` - עדכון בוט
- `DELETE /api/bots/:id` - מחיקת בוט
- `PATCH /api/bots/:id/toggle` - הפעלה/כיבוי בוט

### Blocked Numbers (Global)
- `GET /api/blocked` - רשימת מספרים חסומים
- `POST /api/blocked` - חסימת מספר
- `POST /api/blocked/bulk` - חסימת מספרים מרובים
- `DELETE /api/blocked/:phone` - הסרת חסימה

### Whitelist (Per Bot)
- `GET /api/whitelist/bot/:botId` - רשימה לבנה של בוט
- `POST /api/whitelist` - הוספה לרשימה לבנה
- `POST /api/whitelist/bulk` - הוספה מרובה
- `DELETE /api/whitelist/:botId/:phone` - הסרה מרשימה לבנה

### Livechat
- `GET /api/livechat` - היסטוריית הודעות
- `GET /api/livechat/conversation/:phoneBot/:phone` - שיחה ספציפית
- `GET /api/livechat/stats` - סטטיסטיקות

### n8n Integration
- `POST /api/n8n/trigger/:workflowId` - הפעלת workflow
- `POST /api/n8n/callback/outbound` - קבלת callback על הודעות יוצאות
- `POST /api/n8n/sync/bot` - סנכרון הגדרות בוט
- `POST /api/n8n/sync/whitelist` - סנכרון רשימה לבנה
- `POST /api/n8n/sync/blocked` - סנכרון רשימת חסומים

## Bot Configuration

```json
{
  "phone_number": "972524039934",
  "phone_number_id": "654607704413055",
  "name": "Bot Name",
  "workflow_id": "xxx-xxx-xxx",
  "n8n_webhook_url": "https://n8n.example.com/webhook/xxx",
  "status": "active",
  "access_mode": "everyone|whitelist|dynamic",
  "dynamic_sql_template": "SELECT 1 FROM users WHERE phone LIKE '%{{phone}}'",
  "active_from": "2024-01-01T00:00:00Z",
  "active_until": "2024-12-31T23:59:59Z",
  "delay_seconds": 0
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3380 |
| DB_HOST | PostgreSQL host | postgres |
| DB_PORT | PostgreSQL port | 5432 |
| DB_NAME | Database name | bot_router |
| DB_USER | Database user | bot_router_user |
| DB_PASSWORD | Database password | - |
| MASTER_PHONE | Admin phone (bypasses permissions) | 972584254229 |
| N8N_BASE_URL | n8n base URL | - |
| WEBHOOK_VERIFY_TOKEN | WhatsApp webhook verification token | - |

## License

ISC
