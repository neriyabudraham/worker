import { MessageSquare, GitBranch, Clock, Cog, Database, ChevronLeft } from 'lucide-react';

const nodeTypes = [
  { type: 'message', label: 'שליחת הודעה', icon: MessageSquare, color: 'bg-teal-500', description: 'טקסט, תמונה, כפתורים' },
  { type: 'condition', label: 'תנאי (Switch)', icon: GitBranch, color: 'bg-orange-500', description: 'הסתעפות לפי תנאים' },
  { type: 'database', label: 'מסד נתונים', icon: Database, color: 'bg-green-500', description: 'SQL, הוסף משתתף, כרטיס' },
  { type: 'delay', label: 'השהייה', icon: Clock, color: 'bg-blue-500', description: 'המתנה לפני המשך' },
  { type: 'action', label: 'פעולה', icon: Cog, color: 'bg-pink-500', description: 'תגיות, משתנים' },
];

export default function NodePalette({ onAddNode }) {
  const handleDragStart = (e, type) => {
    e.dataTransfer.setData('application/reactflow', type);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100">
        <h3 className="font-bold text-gray-900 text-lg">הוסף רכיב</h3>
        <p className="text-sm text-gray-500 mt-1">לחץ או גרור לקנבס</p>
      </div>
      
      {/* Node List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {nodeTypes.map(({ type, label, icon: Icon, color, description }) => (
            <div
              key={type}
              draggable
              onDragStart={(e) => handleDragStart(e, type)}
              onClick={() => onAddNode(type)}
              className="group flex items-center gap-4 p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 border border-gray-100 hover:border-gray-200 cursor-pointer transition-all duration-150"
            >
              {/* Icon */}
              <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center shadow-sm flex-shrink-0`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              
              {/* Content */}
              <div className="flex-1">
                <div className="font-semibold text-gray-900">{label}</div>
                <p className="text-sm text-gray-500 mt-0.5">{description}</p>
              </div>
              
              {/* Arrow */}
              <ChevronLeft className="w-5 h-5 text-gray-300 group-hover:text-gray-400 transition-colors flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
