import { memo } from 'react';
import { Cog, Tag, UserCheck, XCircle, Variable } from 'lucide-react';
import BaseNode from './BaseNode';

const actionIcons = {
  add_tag: Tag,
  remove_tag: Tag,
  set_variable: Variable,
  block_user: XCircle,
  mark_completed: UserCheck,
};

function ActionNode({ data, selected }) {
  const actions = data.actions || [];
  
  const getActionLabel = (action) => {
    switch (action.type) {
      case 'add_tag':
        return `הוסף תגית: ${action.tag || '?'}`;
      case 'remove_tag':
        return `הסר תגית: ${action.tag || '?'}`;
      case 'set_variable':
        return `הגדר ${action.variable || '?'} = ${action.value || '?'}`;
      case 'block_user':
        return 'חסום משתמש';
      case 'mark_completed':
        return 'סמן כהושלם';
      default:
        return action.type;
    }
  };
  
  return (
    <BaseNode
      data={data}
      selected={selected}
      type="action"
      color="pink"
      icon={Cog}
      title="פעולה"
    >
      <div className="space-y-2">
        {actions.length === 0 ? (
          <div className="text-center py-2 text-gray-400 text-sm">
            לחץ להוספת פעולות
          </div>
        ) : (
          actions.map((action, idx) => {
            const Icon = actionIcons[action.type] || Cog;
            return (
              <div key={idx} className="flex items-center gap-2 bg-pink-50 rounded-lg px-3 py-2 text-sm">
                <Icon className="w-3 h-3 text-pink-600" />
                <span className="text-pink-700 font-medium text-xs">
                  {getActionLabel(action)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </BaseNode>
  );
}

export default memo(ActionNode);
