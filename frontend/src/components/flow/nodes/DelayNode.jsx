import { memo } from 'react';
import { Clock } from 'lucide-react';
import BaseNode from './BaseNode';

function DelayNode({ data, selected }) {
  const delay = data.delay || 1;
  const unit = data.unit || 'seconds';
  
  const unitLabels = {
    seconds: 'שניות',
    minutes: 'דקות',
    hours: 'שעות',
  };
  
  return (
    <BaseNode
      data={data}
      selected={selected}
      type="delay"
      color="blue"
      icon={Clock}
      title="השהייה"
    >
      <div className="text-center py-2">
        <div className="text-2xl font-bold text-blue-600">{delay}</div>
        <div className="text-sm text-gray-500">{unitLabels[unit] || unit}</div>
      </div>
    </BaseNode>
  );
}

export default memo(DelayNode);
