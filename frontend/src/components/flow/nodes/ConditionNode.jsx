import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { GitBranch, Edit2, Copy, Trash2 } from 'lucide-react';

const operatorLabels = {
  equals: 'שווה',
  not_equals: 'לא שווה',
  contains: 'מכיל',
  not_contains: 'לא מכיל',
  starts_with: 'מתחיל ב',
  ends_with: 'מסתיים ב',
  gt: 'גדול מ',
  lt: 'קטן מ',
  gte: 'גדול או שווה',
  lte: 'קטן או שווה',
  is_empty: 'ריק',
  is_not_empty: 'לא ריק',
};

function ConditionNode({ data, selected }) {
  const conditions = data.conditions || [];
  
  return (
    <div 
      className={`group bg-white rounded-2xl border-2 transition-all duration-200 min-w-[220px] max-w-[300px] ${
        selected 
          ? 'border-orange-400 shadow-lg shadow-orange-200' 
          : 'border-gray-200 shadow-md hover:shadow-lg hover:border-gray-300'
      }`}
    >
      {/* Hover Actions */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-50">
        <div className="flex items-center gap-1 bg-white rounded-xl shadow-lg border border-gray-200 p-1">
          <button 
            onClick={(e) => { e.stopPropagation(); data.onEdit?.(); }}
            className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4 text-blue-600" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); data.onDuplicate?.(); }}
            className="p-2 hover:bg-green-50 rounded-lg transition-colors"
          >
            <Copy className="w-4 h-4 text-green-600" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); data.onDelete?.(); }}
            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
        </div>
      </div>

      {/* Target Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-4 !h-4 bg-orange-500 !border-2 !border-white !-left-2"
      />
      
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-l from-orange-500 to-orange-600 rounded-t-xl">
        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
          <GitBranch className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-white">תנאי (Switch)</span>
      </div>
      
      {/* Content */}
      <div className="p-3">
        {conditions.length === 0 ? (
          <div className="text-center py-2 text-gray-400 text-sm">
            לחץ להגדרת תנאים
          </div>
        ) : (
          <div className="space-y-1">
            {conditions.map((cond, idx) => (
              <div key={idx} className="bg-orange-50 rounded-lg px-2 py-1.5 text-xs">
                <span className="text-orange-700">
                  {cond.field} {operatorLabels[cond.operator] || cond.operator} {cond.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Output Handles */}
      <div className="border-t border-gray-100">
        {conditions.length > 0 ? (
          <>
            {conditions.map((cond, idx) => (
              <div key={idx} className="relative border-b border-gray-50 last:border-0 px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-orange-600 font-medium">
                    תנאי {idx + 1}: {cond.value || 'מתאים'}
                  </span>
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={`cond-${idx}`}
                    style={{ position: 'relative', top: 'auto', right: '-8px' }}
                    className="!w-3 !h-3 bg-orange-500 !border-2 !border-white !relative !transform-none"
                  />
                </div>
              </div>
            ))}
            <div className="relative px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">ברירת מחדל</span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id="default"
                  style={{ position: 'relative', top: 'auto', right: '-8px' }}
                  className="!w-3 !h-3 bg-gray-400 !border-2 !border-white !relative !transform-none"
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="relative px-3 py-2 border-b border-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-xs text-green-600">✓ מתאים</span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id="true"
                  style={{ position: 'relative', top: 'auto', right: '-8px' }}
                  className="!w-3 !h-3 bg-green-500 !border-2 !border-white !relative !transform-none"
                />
              </div>
            </div>
            <div className="relative px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-red-400">✗ לא מתאים</span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id="false"
                  style={{ position: 'relative', top: 'auto', right: '-8px' }}
                  className="!w-3 !h-3 bg-red-400 !border-2 !border-white !relative !transform-none"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default memo(ConditionNode);
