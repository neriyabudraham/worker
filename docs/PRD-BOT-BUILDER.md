# PRD - מערכת בניית בוטים ויזואלית

## סקירה כללית

מערכת לבניית בוטים לוואטסאפ באופן ויזואלי, בהשראת המערכת הקיימת ב-botomat.
המערכת מאפשרת יצירת תהליכים (flows) עם רכיבים שונים שמתחברים ביניהם.

---

## 1. ארכיטקטורה

### Frontend
- **Canvas**: ReactFlow עם CDN (כבר קיים)
- **Nodes**: רכיבים מותאמים לכל סוג
- **Panels**: חלונית צד לעריכה + פאלטת רכיבים
- **State**: ניהול ב-JavaScript global + React

### Backend
- **API**: Express.js (קיים)
- **Database**: PostgreSQL (טבלאות flows, flow_nodes, flow_edges)
- **Executor**: שירות להרצת תהליכים (flowExecutor.js - קיים בסיסי)
- **WhatsApp**: שירות שליחת הודעות (whatsapp.js - קיים)

---

## 2. סוגי רכיבים (Nodes)

### 2.1 Trigger (טריגר התחלה) - סגול
**מצב נוכחי**: קיים בסיסי
**נדרש להשלים**:

```javascript
// config structure
{
  bot_id: number,           // מספר הווטסאפ
  bot_phone: string,        // תצוגה
  access_mode: 'everyone' | 'whitelist' | 'dynamic',
  dynamic_sql_template: string,
  active_until: datetime,
  active_from: datetime,
  delay_seconds: number,
  // חדש - triggerGroups:
  triggerGroups: [
    {
      id: string,
      conditions: [
        {
          type: 'any_message' | 'message_content' | 'first_message' | 'has_tag' | 'no_tag' | 'contact_added',
          operator: 'contains' | 'not_contains' | 'equals' | 'starts_with' | 'regex',
          value: string
        }
      ]
    }
  ],
  // הגדרות מתקדמות
  oncePerUser: boolean,
  hasCooldown: boolean,
  cooldownValue: number,
  cooldownUnit: 'minutes' | 'hours' | 'days',
  hasActiveHours: boolean,
  activeFrom: string, // "09:00"
  activeTo: string    // "18:00"
}
```

**UI בעריכה**:
- Dropdown לבחירת מספר WhatsApp
- קבוצות תנאים (OR בין קבוצות, AND בתוך קבוצה)
- הגדרות cooldown וזמני פעילות

### 2.2 Message (הודעת WhatsApp) - ירוק/טורקיז
**מצב נוכחי**: קיים בסיסי מאוד
**נדרש להשלים**:

```javascript
// config structure
{
  actions: [
    // טקסט
    { type: 'text', content: string, enableLinkPreview: boolean },
    
    // מדיה
    { type: 'image', url: string, caption: string, inputMode: 'upload' | 'url' },
    { type: 'video', url: string, caption: string },
    { type: 'audio', url: string },
    { type: 'file', url: string, filename: string },
    
    // אינטראקטיבי
    { type: 'contact', contactName: string, contactPhone: string },
    { type: 'location', latitude: number, longitude: number, locationTitle: string },
    
    // פעולות
    { type: 'typing', typingDuration: number },
    { type: 'delay', delay: number, unit: 'seconds' | 'minutes' },
    { type: 'mark_seen' },
    { type: 'reaction', reaction: string },
    { type: 'wait_reply', saveToVariable: boolean, variableName: string, timeout: number }
  ],
  waitForReply: boolean,
  timeout: number
}
```

**UI בעריכה**:
- גריד של כפתורים להוספת סוגי תוכן
- Drag & Drop לסידור מחדש
- כל פעולה עם אזור עריכה ספציפי
- תמיכה במשתנים `{{variable}}`
- העלאת קבצים או URL

**Handles**:
- אם יש `wait_reply` עם timeout: שתי יציאות (reply, timeout)
- אחרת: יציאה אחת

### 2.3 List (רשימת בחירה) - ציאן
**מצב נוכחי**: לא קיים
**נדרש לבנות**:

```javascript
{
  title: string,
  body: string,
  buttonText: string,  // "בחר"
  sections: [
    {
      title: string,
      rows: [
        { id: string, title: string, description: string }
      ]
    }
  ],
  waitForReply: true,
  timeout: number
}
```

**UI בנוד**:
- הצגת כפתורים/אופציות
- יציאה לכל אופציה + יציאת timeout

### 2.4 Condition (תנאי) - כתום
**מצב נוכחי**: לא קיים
**נדרש לבנות**:

```javascript
{
  conditions: [
    {
      id: string,
      field: string,      // 'message' | 'contact.name' | 'variable.xxx'
      operator: 'equals' | 'contains' | 'starts_with' | 'greater_than' | 'less_than' | 'regex',
      value: string
    }
  ],
  logic: 'and' | 'or'
}
```

**UI בנוד**:
- יציאת "true" (ירוק)
- יציאת "false" (אדום)

### 2.5 Delay (השהייה) - כחול
**מצב נוכחי**: קיים בסיסי
**נדרש להשלים**:

```javascript
{
  actions: [
    { type: 'wait', duration: number, unit: 'seconds' | 'minutes' | 'hours' | 'days' },
    { type: 'wait_until', datetime: string },
    { type: 'wait_for_reply', timeout: number, timeoutPath: string }
  ]
}
```

### 2.6 Action (פעולה) - ורוד
**מצב נוכחי**: לא קיים
**נדרש לבנות**:

```javascript
{
  actions: [
    // תגיות
    { type: 'add_tag', tag: string },
    { type: 'remove_tag', tag: string },
    
    // משתנים
    { type: 'set_variable', variable: string, value: string },
    { type: 'increment_variable', variable: string, amount: number },
    
    // בוטים
    { type: 'stop_bot' },
    { type: 'start_bot', botId: number },
    
    // לוגיקה
    { type: 'goto', nodeId: string },
    { type: 'end_flow' }
  ]
}
```

### 2.7 Note (הערה) - צהוב
**מצב נוכחי**: לא קיים
**נדרש לבנות**:

```javascript
{
  note: string,
  color: 'yellow' | 'blue' | 'green' | 'red' | 'purple'
}
```

**UI**: אין חיבורים, רק הערה ויזואלית

### 2.8 Integration (אינטגרציה) - כתום
**מצב נוכחי**: לא קיים
**נדרש לבנות**:

```javascript
{
  actions: [
    // HTTP
    { type: 'http_request', method: 'GET' | 'POST', url: string, headers: object, body: string, saveToVariable: string },
    
    // Google Sheets
    { type: 'sheets_read', spreadsheetId: string, range: string, saveToVariable: string },
    { type: 'sheets_append', spreadsheetId: string, range: string, values: array },
    
    // Webhook
    { type: 'webhook', url: string, payload: object }
  ]
}
```

### 2.9 Registration (תהליך רישום) - אינדיגו
**מצב נוכחי**: לא קיים
**נדרש לבנות**:

```javascript
{
  title: string,
  welcomeMessage: string,
  questions: [
    { id: string, question: string, variable: string, validation: string, errorMessage: string }
  ],
  completionMessage: string,
  cancelKeyword: string,
  cancelMessage: string,
  sendSummary: boolean
}
```

### 2.10 SendOther (שליחה למספר אחר) - סגול
**מצב נוכחי**: לא קיים
**נדרש לבנות**:

```javascript
{
  recipient: {
    type: 'phone' | 'group' | 'variable',
    phone: string,
    groupId: string,
    variableName: string
  },
  actions: [...] // כמו Message
}
```

---

## 3. רכיבי Frontend

### 3.1 BaseNode Component
**קובץ**: `public/builder/components/BaseNode.js`

```javascript
// מבנה כללי לכל נוד
{
  header: { icon, title, color },
  content: slot,
  hoverActions: [edit, duplicate, delete],
  handles: { target: boolean, sources: array }
}
```

### 3.2 NodeEditor Panel
**קובץ**: `public/builder/components/NodeEditor.js`

- Header עם צבע לפי סוג
- תוכן עריכה דינמי
- כפתור מחיקה (לא לטריגר)
- X לסגירה

### 3.3 NodePalette Panel
**קובץ**: `public/builder/components/NodePalette.js`

- רשימת כל סוגי הרכיבים
- Click או Drag להוספה
- אייקון + תיאור לכל סוג

### 3.4 TextInputWithVariables Component
**קובץ**: `public/builder/components/TextInput.js`

- Input רגיל עם תמיכה ב-`{{variables}}`
- הצגת משתנים כ-badges
- Autocomplete למשתנים קיימים

### 3.5 QuickAddMenu
**קובץ**: `public/builder/components/QuickAddMenu.js`

- מופיע כשמושכים edge לאוויר
- בחירת סוג רכיב להוספה

---

## 4. Flow Executor

### 4.1 מבנה הרצה
**קובץ**: `src/services/flowExecutor.js`

```javascript
class FlowExecutor {
  async executeFlow(flowId, messageData, originalPayload) {
    // 1. Load flow, nodes, edges
    // 2. Create execution context
    // 3. Find trigger node
    // 4. Execute recursively via edges
  }
  
  async executeNode(context, node) {
    switch(node.type) {
      case 'trigger': return this.executeTrigger(context, node);
      case 'message': return this.executeMessage(context, node);
      case 'condition': return this.executeCondition(context, node);
      case 'delay': return this.executeDelay(context, node);
      case 'action': return this.executeAction(context, node);
      case 'list': return this.executeList(context, node);
      // ...
    }
  }
}
```

### 4.2 Context Object
```javascript
{
  flowId,
  executionId,
  phone,           // מספר הלקוח
  message,         // ההודעה שהתקבלה
  messageData,     // כל מידע ההודעה
  originalPayload, // ה-webhook המקורי
  variables: {},   // משתנים דינמיים
  wa: WhatsAppService,
  bot: { ... }
}
```

### 4.3 Variable Replacement
```javascript
replaceVariables(text, context) {
  return text
    .replace(/{{phone}}/g, context.phone)
    .replace(/{{message}}/g, context.message)
    .replace(/{{name}}/g, context.messageData?.contactName)
    .replace(/{{date}}/g, new Date().toLocaleDateString('he-IL'))
    .replace(/{{time}}/g, new Date().toLocaleTimeString('he-IL'))
    .replace(/\{\{(\w+)\}\}/g, (_, v) => context.variables[v] || '');
}
```

---

## 5. API Endpoints

### 5.1 Flows
- `GET /api/flows` - רשימת תהליכים
- `POST /api/flows` - יצירת תהליך חדש
- `GET /api/flows/:id` - פרטי תהליך
- `PUT /api/flows/:id` - עדכון תהליך
- `DELETE /api/flows/:id` - מחיקת תהליך
- `PUT /api/flows/:id/canvas` - שמירת nodes + edges
- `GET /api/flows/available-bots` - בוטים זמינים לטריגר

### 5.2 WhatsApp
- `POST /api/whatsapp/verify` - אימות credentials
- `POST /api/whatsapp/numbers` - הוספת מספר
- `GET /api/whatsapp/numbers` - רשימת מספרים
- `POST /api/whatsapp/send` - שליחת הודעה
- `POST /api/whatsapp/send-buttons` - שליחת כפתורים (**חסר!**)

### 5.3 Variables
- `GET /api/variables` - רשימת משתנים
- `POST /api/variables` - יצירת משתנה
- `PUT /api/variables/:id` - עדכון משתנה
- `DELETE /api/variables/:id` - מחיקת משתנה

### 5.4 Tags
- `GET /api/tags` - רשימת תגיות
- `POST /api/tags` - יצירת תגית
- `DELETE /api/tags/:id` - מחיקת תגית

---

## 6. Database Schema

### 6.1 טבלאות קיימות (לעדכן)
```sql
-- flows - קיים, להוסיף:
ALTER TABLE flows ADD COLUMN is_active BOOLEAN DEFAULT true;
ALTER TABLE flows ADD COLUMN trigger_config JSONB;

-- flow_nodes - קיים
-- flow_edges - קיים
-- flow_executions - קיים
```

### 6.2 טבלאות חדשות
```sql
-- משתני מערכת
CREATE TABLE variables (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  label VARCHAR(255),
  default_value TEXT,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- משתני יוזר (לכל איש קשר)
CREATE TABLE contact_variables (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  variable_id INTEGER REFERENCES variables(id),
  value TEXT,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(phone, variable_id)
);

-- תגיות
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

-- תגיות לאנשי קשר
CREATE TABLE contact_tags (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  tag_id INTEGER REFERENCES tags(id),
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(phone, tag_id)
);

-- היסטוריית הרצות
CREATE TABLE flow_execution_logs (
  id SERIAL PRIMARY KEY,
  execution_id INTEGER REFERENCES flow_executions(id),
  node_id VARCHAR(100),
  node_type VARCHAR(50),
  action VARCHAR(100),
  input JSONB,
  output JSONB,
  error TEXT,
  executed_at TIMESTAMP DEFAULT NOW()
);

-- cooldowns
CREATE TABLE flow_cooldowns (
  id SERIAL PRIMARY KEY,
  flow_id INTEGER REFERENCES flows(id),
  phone VARCHAR(20) NOT NULL,
  last_triggered TIMESTAMP NOT NULL,
  UNIQUE(flow_id, phone)
);
```

---

## 7. משימות לפי סדר עדיפות

### Phase 1: תשתית (בסיסי - קיים חלקית)
- [x] Flow builder canvas עם ReactFlow
- [x] Trigger node בסיסי
- [x] Message node בסיסי
- [x] שמירת/טעינת flows
- [x] flowExecutor בסיסי
- [x] WhatsApp service

### Phase 2: שליחת הודעות (קריטי)
- [ ] **כפתורים אינטראקטיביים** - sendButtonMessage
- [ ] שליחת תמונות עם caption
- [ ] שליחת וידאו
- [ ] שליחת קבצים
- [ ] שליחת מיקום
- [ ] שליחת איש קשר (vCard)
- [ ] ריאקציה על הודעה
- [ ] סימון כנקרא
- [ ] "מקליד..."

### Phase 3: עריכת רכיבים (UI)
- [ ] MessageEditor מלא עם כל סוגי התוכן
- [ ] TriggerEditor עם trigger groups
- [ ] TextInputWithVariables component
- [ ] העלאת קבצים לשרת
- [ ] תצוגה מקדימה של מדיה

### Phase 4: רכיבים נוספים
- [ ] List node (רשימת בחירה)
- [ ] Condition node (תנאים)
- [ ] Delay node (מלא)
- [ ] Action node (תגיות, משתנים)
- [ ] Note node

### Phase 5: לוגיקה מתקדמת
- [ ] המתנה לתשובה (wait_reply)
- [ ] Timeout handling
- [ ] תנאים והסתעפויות
- [ ] משתנים ושמירה
- [ ] Cooldown

### Phase 6: פיצ'רים מתקדמים
- [ ] Registration node (שאלון)
- [ ] Integration node (API, webhooks)
- [ ] SendOther node
- [ ] תגיות ואנשי קשר
- [ ] סטטיסטיקות והיסטוריה

---

## 8. דוגמה: שליחת כפתורים

### Backend (whatsapp.js)
```javascript
async sendButtonMessage(to, text, buttons) {
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text },
      action: {
        buttons: buttons.map((btn, i) => ({
          type: 'reply',
          reply: {
            id: btn.id || `btn_${i}`,
            title: btn.title.substring(0, 20) // מקסימום 20 תווים
          }
        }))
      }
    }
  };
  
  return this.sendRequest(payload);
}
```

### flowExecutor
```javascript
async executeMessageNode(context, config) {
  for (const action of config.actions || []) {
    const text = this.replaceVariables(action.content || action.text, context);
    
    if (action.type === 'text') {
      if (action.buttons?.length > 0) {
        await context.wa.sendButtonMessage(context.phone, text, action.buttons);
      } else {
        await context.wa.sendTextMessage(context.phone, text);
      }
    }
    // ... more action types
  }
}
```

---

## 9. הערות חשובות

### WhatsApp API Limits
- כפתורים: מקסימום 3
- תווים בכפתור: מקסימום 20
- רשימה: מקסימום 10 sections, 10 rows כל אחת
- טקסט: מקסימום 4096 תווים
- Caption: מקסימום 1024 תווים

### Performance
- שמירה אוטומטית של draft ב-localStorage
- Debounce בשליחת עדכונים לשרת
- מניעת duplicate executions
- Cooldown בין הודעות לאותו משתמש

### Security
- Validation של כל input
- Rate limiting על webhooks
- אימות credentials לפני שמירה
- Sanitization של SQL queries דינמיים
