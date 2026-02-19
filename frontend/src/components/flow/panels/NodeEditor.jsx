import { useState, useEffect } from 'react';
import { X, Plus, Trash2, MessageSquare, GitBranch, Database, Clock, Cog, Zap } from 'lucide-react';

const nodeConfigs = {
  trigger: { title: 'טריגר התחלה', icon: Zap, color: 'purple' },
  message: { title: 'שליחת הודעה', icon: MessageSquare, color: 'teal' },
  condition: { title: 'תנאי (Switch)', icon: GitBranch, color: 'orange' },
  database: { title: 'מסד נתונים', icon: Database, color: 'green' },
  delay: { title: 'השהייה', icon: Clock, color: 'blue' },
  action: { title: 'פעולה', icon: Cog, color: 'pink' },
};

export default function NodeEditor({ node, onUpdate, onClose, onDelete }) {
  const [data, setData] = useState(node?.data || {});
  const config = nodeConfigs[node?.type] || nodeConfigs.message;
  const Icon = config.icon;
  
  useEffect(() => {
    setData(node?.data || {});
  }, [node?.id]);
  
  const handleChange = (key, value) => {
    const newData = { ...data, [key]: value };
    setData(newData);
    onUpdate(node.id, newData);
  };
  
  const handleArrayAdd = (key, item) => {
    const arr = [...(data[key] || []), item];
    handleChange(key, arr);
  };
  
  const handleArrayUpdate = (key, index, item) => {
    const arr = [...(data[key] || [])];
    arr[index] = item;
    handleChange(key, arr);
  };
  
  const handleArrayRemove = (key, index) => {
    const arr = [...(data[key] || [])];
    arr.splice(index, 1);
    handleChange(key, arr);
  };
  
  return (
    <div className="w-96 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className={`px-6 py-4 border-b border-gray-100 bg-gradient-to-l from-${config.color}-500 to-${config.color}-600`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">{config.title}</h3>
              <p className="text-white/70 text-sm">עריכת הגדרות</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {node?.type === 'trigger' && (
          <TriggerEditor data={data} onChange={handleChange} />
        )}
        
        {node?.type === 'message' && (
          <MessageEditor 
            data={data} 
            onChange={handleChange}
            onArrayAdd={handleArrayAdd}
            onArrayUpdate={handleArrayUpdate}
            onArrayRemove={handleArrayRemove}
          />
        )}
        
        {node?.type === 'condition' && (
          <ConditionEditor 
            data={data} 
            onChange={handleChange}
            onArrayAdd={handleArrayAdd}
            onArrayUpdate={handleArrayUpdate}
            onArrayRemove={handleArrayRemove}
          />
        )}
        
        {node?.type === 'database' && (
          <DatabaseEditor data={data} onChange={handleChange} />
        )}
        
        {node?.type === 'delay' && (
          <DelayEditor data={data} onChange={handleChange} />
        )}
        
        {node?.type === 'action' && (
          <ActionEditor 
            data={data} 
            onChange={handleChange}
            onArrayAdd={handleArrayAdd}
            onArrayUpdate={handleArrayUpdate}
            onArrayRemove={handleArrayRemove}
          />
        )}
      </div>
      
      {/* Footer */}
      {node?.type !== 'trigger' && (
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={() => onDelete(node.id)}
            className="w-full px-4 py-2.5 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            מחק רכיב
          </button>
        </div>
      )}
    </div>
  );
}

function TriggerEditor({ data, onChange }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">סוג טריגר</label>
        <select
          value={data.triggerType || 'message_received'}
          onChange={(e) => onChange('triggerType', e.target.value)}
          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-200 outline-none"
        >
          <option value="message_received">💬 הודעה התקבלה</option>
          <option value="keyword">🔑 מילת מפתח</option>
          <option value="button_click">👆 לחיצה על כפתור</option>
          <option value="list_select">📋 בחירה מרשימה</option>
          <option value="any_message">💬 כל הודעה</option>
        </select>
      </div>
      
      {data.triggerType === 'keyword' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">מילת מפתח</label>
          <input
            type="text"
            value={data.keyword || ''}
            onChange={(e) => onChange('keyword', e.target.value)}
            placeholder="לדוגמה: הגרלה"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-200 outline-none"
          />
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">תיאור (אופציונלי)</label>
        <input
          type="text"
          value={data.description || ''}
          onChange={(e) => onChange('description', e.target.value)}
          placeholder="תיאור הטריגר..."
          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-200 outline-none"
        />
      </div>
    </div>
  );
}

function MessageEditor({ data, onChange, onArrayAdd, onArrayUpdate, onArrayRemove }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">סוג הודעה</label>
        <select
          value={data.messageType || 'text'}
          onChange={(e) => onChange('messageType', e.target.value)}
          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-200 outline-none"
        >
          <option value="text">טקסט</option>
          <option value="image">תמונה</option>
          <option value="buttons">כפתורים</option>
          <option value="list">רשימה</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">תוכן ההודעה</label>
        <textarea
          value={data.message || ''}
          onChange={(e) => onChange('message', e.target.value)}
          placeholder="הקלד את ההודעה..."
          rows={4}
          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-200 outline-none resize-none"
        />
        <p className="text-xs text-gray-400 mt-1">
          משתנים: {'{{name}}'}, {'{{phone}}'}, {'{{cards}}'}
        </p>
      </div>
      
      {(data.messageType === 'image' || data.messageType === 'buttons') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">URL מדיה (אופציונלי)</label>
          <input
            type="url"
            value={data.mediaUrl || ''}
            onChange={(e) => onChange('mediaUrl', e.target.value)}
            placeholder="https://..."
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-200 outline-none"
            dir="ltr"
          />
        </div>
      )}
      
      {(data.messageType === 'buttons' || data.messageType === 'list') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">כפתורים</label>
          <div className="space-y-2">
            {(data.buttons || []).map((btn, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={btn.label || ''}
                  onChange={(e) => onArrayUpdate('buttons', idx, { ...btn, label: e.target.value })}
                  placeholder={`כפתור ${idx + 1}`}
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                />
                <button
                  onClick={() => onArrayRemove('buttons', idx)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {(data.buttons || []).length < 3 && (
              <button
                onClick={() => onArrayAdd('buttons', { label: '', id: Date.now() })}
                className="w-full px-3 py-2 border-2 border-dashed border-gray-200 text-gray-500 rounded-lg text-sm hover:border-teal-300 hover:text-teal-600 transition-colors"
              >
                <Plus className="w-4 h-4 inline mr-1" />
                הוסף כפתור
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ConditionEditor({ data, onChange, onArrayAdd, onArrayUpdate, onArrayRemove }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">תנאים</label>
        <div className="space-y-3">
          {(data.conditions || []).map((cond, idx) => (
            <div key={idx} className="p-3 bg-orange-50 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-orange-700">תנאי {idx + 1}</span>
                <button
                  onClick={() => onArrayRemove('conditions', idx)}
                  className="p-1 text-red-500 hover:bg-red-100 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <input
                type="text"
                value={cond.field || ''}
                onChange={(e) => onArrayUpdate('conditions', idx, { ...cond, field: e.target.value })}
                placeholder="שדה (לדוגמה: message)"
                className="w-full px-3 py-2 bg-white border border-orange-200 rounded-lg text-sm"
              />
              <select
                value={cond.operator || 'equals'}
                onChange={(e) => onArrayUpdate('conditions', idx, { ...cond, operator: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-orange-200 rounded-lg text-sm"
              >
                <option value="equals">שווה</option>
                <option value="contains">מכיל</option>
                <option value="starts_with">מתחיל ב</option>
                <option value="gt">גדול מ</option>
                <option value="lt">קטן מ</option>
              </select>
              <input
                type="text"
                value={cond.value || ''}
                onChange={(e) => onArrayUpdate('conditions', idx, { ...cond, value: e.target.value })}
                placeholder="ערך"
                className="w-full px-3 py-2 bg-white border border-orange-200 rounded-lg text-sm"
              />
            </div>
          ))}
          <button
            onClick={() => onArrayAdd('conditions', { field: '', operator: 'equals', value: '' })}
            className="w-full px-3 py-2 border-2 border-dashed border-gray-200 text-gray-500 rounded-lg text-sm hover:border-orange-300 hover:text-orange-600 transition-colors"
          >
            <Plus className="w-4 h-4 inline mr-1" />
            הוסף תנאי
          </button>
        </div>
      </div>
    </div>
  );
}

function DatabaseEditor({ data, onChange }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">סוג פעולה</label>
        <select
          value={data.actionType || 'sql_query'}
          onChange={(e) => onChange('actionType', e.target.value)}
          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-200 outline-none"
        >
          <option value="sql_query">שאילתא SQL</option>
          <option value="add_participant">הוסף משתתף להגרלה</option>
          <option value="update_participant">עדכן משתתף</option>
          <option value="add_card">הוסף כרטיס</option>
          <option value="check_participant">בדוק אם משתתף קיים</option>
        </select>
      </div>
      
      {data.actionType === 'sql_query' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">שאילתא SQL</label>
          <textarea
            value={data.sql || ''}
            onChange={(e) => onChange('sql', e.target.value)}
            placeholder="SELECT * FROM..."
            rows={4}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-200 outline-none resize-none font-mono text-sm"
            dir="ltr"
          />
        </div>
      )}
      
      {data.actionType === 'add_card' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">כמות כרטיסים</label>
          <input
            type="number"
            value={data.cardCount || 1}
            onChange={(e) => onChange('cardCount', parseInt(e.target.value) || 1)}
            min={1}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-200 outline-none"
          />
        </div>
      )}
      
      {data.actionType === 'update_participant' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">שדה לעדכון</label>
          <select
            value={data.updateField || 'status'}
            onChange={(e) => onChange('updateField', e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-200 outline-none"
          >
            <option value="status">סטטוס</option>
            <option value="full_name">שם מלא</option>
            <option value="cards">כרטיסים</option>
            <option value="share_count">שיתופים</option>
          </select>
          <input
            type="text"
            value={data.updateValue || ''}
            onChange={(e) => onChange('updateValue', e.target.value)}
            placeholder="ערך חדש"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-200 outline-none mt-2"
          />
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">שמור תוצאה למשתנה (אופציונלי)</label>
        <input
          type="text"
          value={data.saveToVariable || ''}
          onChange={(e) => onChange('saveToVariable', e.target.value)}
          placeholder="שם המשתנה"
          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-200 outline-none"
        />
      </div>
    </div>
  );
}

function DelayEditor({ data, onChange }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">זמן המתנה</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={data.delay || 1}
            onChange={(e) => onChange('delay', parseInt(e.target.value) || 1)}
            min={1}
            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 outline-none"
          />
          <select
            value={data.unit || 'seconds'}
            onChange={(e) => onChange('unit', e.target.value)}
            className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-200 outline-none"
          >
            <option value="seconds">שניות</option>
            <option value="minutes">דקות</option>
            <option value="hours">שעות</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function ActionEditor({ data, onChange, onArrayAdd, onArrayUpdate, onArrayRemove }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">פעולות</label>
        <div className="space-y-3">
          {(data.actions || []).map((action, idx) => (
            <div key={idx} className="p-3 bg-pink-50 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-pink-700">פעולה {idx + 1}</span>
                <button
                  onClick={() => onArrayRemove('actions', idx)}
                  className="p-1 text-red-500 hover:bg-red-100 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <select
                value={action.type || 'add_tag'}
                onChange={(e) => onArrayUpdate('actions', idx, { ...action, type: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-pink-200 rounded-lg text-sm"
              >
                <option value="add_tag">הוסף תגית</option>
                <option value="remove_tag">הסר תגית</option>
                <option value="set_variable">הגדר משתנה</option>
                <option value="block_user">חסום משתמש</option>
                <option value="mark_completed">סמן כהושלם</option>
              </select>
              {(action.type === 'add_tag' || action.type === 'remove_tag') && (
                <input
                  type="text"
                  value={action.tag || ''}
                  onChange={(e) => onArrayUpdate('actions', idx, { ...action, tag: e.target.value })}
                  placeholder="שם התגית"
                  className="w-full px-3 py-2 bg-white border border-pink-200 rounded-lg text-sm"
                />
              )}
              {action.type === 'set_variable' && (
                <>
                  <input
                    type="text"
                    value={action.variable || ''}
                    onChange={(e) => onArrayUpdate('actions', idx, { ...action, variable: e.target.value })}
                    placeholder="שם המשתנה"
                    className="w-full px-3 py-2 bg-white border border-pink-200 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    value={action.value || ''}
                    onChange={(e) => onArrayUpdate('actions', idx, { ...action, value: e.target.value })}
                    placeholder="ערך"
                    className="w-full px-3 py-2 bg-white border border-pink-200 rounded-lg text-sm"
                  />
                </>
              )}
            </div>
          ))}
          <button
            onClick={() => onArrayAdd('actions', { type: 'add_tag', tag: '' })}
            className="w-full px-3 py-2 border-2 border-dashed border-gray-200 text-gray-500 rounded-lg text-sm hover:border-pink-300 hover:text-pink-600 transition-colors"
          >
            <Plus className="w-4 h-4 inline mr-1" />
            הוסף פעולה
          </button>
        </div>
      </div>
    </div>
  );
}
