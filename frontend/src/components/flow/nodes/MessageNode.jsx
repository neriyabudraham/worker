import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { MessageSquare, Image, FileText, Edit2, Copy, Trash2 } from 'lucide-react';

function MessageNode({ data, selected }) {
  const message = data.message || '';
  const messageType = data.messageType || 'text';
  const buttons = data.buttons || [];
  const hasButtons = buttons.length > 0;
  
  const typeIcons = {
    text: MessageSquare,
    image: Image,
    file: FileText,
    buttons: MessageSquare,
    list: MessageSquare,
  };
  
  const Icon = typeIcons[messageType] || MessageSquare;
  
  return (
    <div 
      className={`group bg-white rounded-2xl border-2 transition-all duration-200 min-w-[220px] max-w-[300px] ${
        selected 
          ? 'border-teal-400 shadow-lg shadow-teal-200' 
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
        className="!w-4 !h-4 bg-teal-500 !border-2 !border-white !-left-2"
      />
      
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-l from-teal-500 to-teal-600 rounded-t-xl">
        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
          <Icon className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-white">שליחת הודעה</span>
      </div>
      
      {/* Content */}
      <div className="p-3 space-y-2">
        {message ? (
          <div className="bg-gray-50 rounded-lg p-2 text-sm text-gray-600 line-clamp-3">
            {message}
          </div>
        ) : (
          <div className="text-center py-2 text-gray-400 text-sm">
            לחץ להוספת הודעה
          </div>
        )}
        
        {data.mediaUrl && (
          <div className="text-xs text-teal-600 bg-teal-50 px-2 py-1 rounded">
            📎 מדיה מצורפת
          </div>
        )}
      </div>
      
      {/* Buttons section with handles */}
      {hasButtons ? (
        <div className="border-t border-gray-100">
          {buttons.map((btn, idx) => (
            <div key={idx} className="relative border-b border-gray-50 last:border-0 px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-teal-600 font-medium">{btn.label || `כפתור ${idx + 1}`}</span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`btn-${idx}`}
                  style={{ position: 'relative', top: 'auto', right: '-8px' }}
                  className="!w-3 !h-3 bg-teal-500 !border-2 !border-white !relative !transform-none"
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-4 !h-4 bg-teal-500 !border-2 !border-white !-right-2"
        />
      )}
    </div>
  );
}

export default memo(MessageNode);
