import { memo } from 'react';
import { Database, UserPlus, UserPen, Ticket } from 'lucide-react';
import BaseNode from './BaseNode';

const actionLabels = {
  sql_query: { label: 'שאילתא SQL', icon: Database, color: 'green' },
  add_participant: { label: 'הוסף משתתף', icon: UserPlus, color: 'green' },
  update_participant: { label: 'עדכן משתתף', icon: UserPen, color: 'green' },
  add_card: { label: 'הוסף כרטיס', icon: Ticket, color: 'green' },
  check_participant: { label: 'בדוק משתתף', icon: Database, color: 'green' },
};

function DatabaseNode({ data, selected }) {
  const actionType = data.actionType || 'sql_query';
  const config = actionLabels[actionType] || actionLabels.sql_query;
  const Icon = config.icon;
  
  const getSummary = () => {
    switch (actionType) {
      case 'sql_query':
        return data.sql ? `${data.sql.substring(0, 50)}...` : 'הגדר שאילתא';
      case 'add_participant':
        return 'הוסף משתתף חדש להגרלה';
      case 'update_participant':
        return data.updateField ? `עדכן ${data.updateField}` : 'הגדר שדה לעדכון';
      case 'add_card':
        return `הוסף ${data.cardCount || 1} כרטיסים`;
      case 'check_participant':
        return 'בדוק אם משתתף קיים';
      default:
        return 'לחץ להגדרה';
    }
  };
  
  return (
    <BaseNode
      data={data}
      selected={selected}
      type="database"
      color={config.color}
      icon={Icon}
      title={config.label}
    >
      <div className="space-y-2">
        <div className="bg-green-50 rounded-lg px-3 py-2 text-sm">
          <span className="text-green-700 font-medium text-xs">
            {getSummary()}
          </span>
        </div>
        
        {actionType === 'add_card' && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Ticket className="w-3 h-3" />
            <span>+{data.cardCount || 1} כרטיסים</span>
          </div>
        )}
        
        {data.saveToVariable && (
          <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
            📥 שמור לתוך: {data.saveToVariable}
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export default memo(DatabaseNode);
