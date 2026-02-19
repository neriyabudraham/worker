import { memo } from 'react';
import { Zap } from 'lucide-react';
import BaseNode from './BaseNode';

const triggerLabels = {
  message_received: '💬 הודעה התקבלה',
  button_click: '👆 לחיצה על כפתור',
  list_select: '📋 בחירה מרשימה',
  keyword: '🔑 מילת מפתח',
  any_message: '💬 כל הודעה',
};

function TriggerNode({ data, selected }) {
  const triggerType = data.triggerType || 'message_received';
  const keyword = data.keyword || '';
  
  return (
    <BaseNode
      data={data}
      selected={selected}
      type="trigger"
      color="purple"
      icon={Zap}
      title="טריגר התחלה"
      hasTarget={false}
      canDelete={false}
      canDuplicate={false}
    >
      <div className="space-y-2">
        <div className="bg-purple-50 rounded-lg px-3 py-2 text-sm">
          <span className="text-purple-700 font-medium">
            {triggerLabels[triggerType] || triggerType}
          </span>
        </div>
        
        {triggerType === 'keyword' && keyword && (
          <div className="text-xs text-gray-500">
            מילה: "{keyword}"
          </div>
        )}
        
        {data.description && (
          <div className="text-xs text-gray-400 border-t border-purple-100 pt-2">
            {data.description}
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export default memo(TriggerNode);
