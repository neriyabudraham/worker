import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowRight, Edit2, RotateCcw, Play, Pause, BarChart3, X, Users, Trophy } from 'lucide-react';
import useFlowsStore from '../store/flowsStore';
import FlowBuilder from '../components/flow/FlowBuilder';
import NodePalette from '../components/flow/NodePalette';
import NodeEditor from '../components/flow/panels/NodeEditor';
import api from '../services/api';

export default function FlowEditorPage() {
  const { flowId } = useParams();
  const navigate = useNavigate();
  const { currentFlow, fetchFlow, updateFlow, saveCanvas, clearCurrentFlow } = useFlowsStore();
  const [flowData, setFlowData] = useState(null);
  const [originalFlowData, setOriginalFlowData] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [flowName, setFlowName] = useState('');
  const [flowKey, setFlowKey] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState(null);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    fetchFlow(flowId).then((flow) => {
      setFlowName(flow.name);
      
      const defaultData = {
        nodes: [{
          id: 'trigger_start',
          type: 'trigger',
          position: { x: 100, y: 200 },
          data: { triggerType: 'message_received' },
        }],
        edges: [],
      };
      
      // Convert DB nodes to ReactFlow format
      const savedNodes = flow.nodes?.map(n => ({
        id: n.node_id,
        type: n.type === 'custom' ? n.subtype : n.type,
        position: { x: n.position_x || 0, y: n.position_y || 0 },
        data: n.config || {},
      })) || [];
      
      const savedEdges = flow.edges?.map(e => ({
        id: e.edge_id,
        source: e.source_node_id,
        sourceHandle: e.source_handle,
        target: e.target_node_id,
        targetHandle: e.target_handle,
      })) || [];
      
      const savedData = savedNodes.length > 0 ? { nodes: savedNodes, edges: savedEdges } : defaultData;
      
      setOriginalFlowData(JSON.parse(JSON.stringify(savedData)));
      setFlowData(savedData);
      setHasChanges(false);
      
      setTimeout(() => {
        isInitialLoad.current = false;
      }, 200);
    });
    
    return () => clearCurrentFlow();
  }, [flowId]);

  useEffect(() => {
    if (showStats && flowId) {
      api.get(`/flows/${flowId}/stats`).then(res => setStats(res.data)).catch(() => {});
    }
  }, [showStats, flowId]);

  const selectedNode = flowData?.nodes?.find(n => n.id === selectedNodeId) || null;

  const checkForChanges = useCallback((newData) => {
    if (!originalFlowData) return false;
    
    const cleanForCompare = (data) => ({
      nodes: data.nodes?.map(n => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: Object.fromEntries(
          Object.entries(n.data || {}).filter(([k]) => !['onEdit', 'onDelete', 'onDuplicate'].includes(k))
        )
      })) || [],
      edges: data.edges?.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle
      })) || []
    });
    
    const cleanNew = cleanForCompare(newData);
    const cleanOriginal = cleanForCompare(originalFlowData);
    
    return JSON.stringify(cleanNew) !== JSON.stringify(cleanOriginal);
  }, [originalFlowData]);

  const handleNodeUpdate = useCallback((nodeId, newData) => {
    setFlowData(prev => {
      if (!prev) return prev;
      
      const updated = {
        ...prev,
        nodes: prev.nodes.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n),
      };
      setHasChanges(checkForChanges(updated));
      return updated;
    });
    setFlowKey(k => k + 1);
  }, [checkForChanges]);

  const handleFlowChange = useCallback((newData) => {
    setFlowData(prev => {
      if (prev === newData) return prev;
      
      if (!isInitialLoad.current && originalFlowData) {
        const hasRealChanges = checkForChanges(newData);
        setHasChanges(hasRealChanges);
      }
      return newData;
    });
  }, [checkForChanges, originalFlowData]);

  const handleNodeSelect = useCallback((node) => {
    setSelectedNodeId(node?.id || null);
  }, []);

  const handleNodeDelete = useCallback((nodeId) => {
    setFlowData(prev => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        nodes: prev.nodes.filter(n => n.id !== nodeId),
        edges: prev.edges.filter(e => e.source !== nodeId && e.target !== nodeId),
      };
      setHasChanges(checkForChanges(updated));
      return updated;
    });
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
    setFlowKey(k => k + 1);
  }, [selectedNodeId, checkForChanges]);

  const handleEdgeDelete = useCallback((edgeId) => {
    setFlowData(prev => {
      if (!prev) return prev;
      const updated = { ...prev, edges: prev.edges.filter(e => e.id !== edgeId) };
      setHasChanges(checkForChanges(updated));
      return updated;
    });
  }, [checkForChanges]);

  const handleAddNode = useCallback((type) => {
    if (!flowData) return;
    const newNodeId = `${type}_${Date.now()}`;
    const newNode = {
      id: newNodeId,
      type,
      position: { x: 300 + Math.random() * 100, y: 150 + (flowData.nodes?.length || 0) * 120 },
      data: getDefaultData(type),
    };
    setFlowData(prev => {
      const updated = { ...prev, nodes: [...prev.nodes, newNode] };
      setHasChanges(checkForChanges(updated));
      return updated;
    });
    setSelectedNodeId(newNodeId);
    setFlowKey(k => k + 1);
  }, [flowData, checkForChanges]);

  const handleSave = async () => {
    if (!flowData) return;
    setIsSaving(true);
    try {
      await saveCanvas(flowId, flowData.nodes, flowData.edges);
      setOriginalFlowData(JSON.parse(JSON.stringify(flowData)));
      setHasChanges(false);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 3000);
    } catch (err) {
      console.error(err);
      alert('שגיאה בשמירה. נסה שוב.');
    }
    setIsSaving(false);
  };

  const handleDiscard = () => {
    if (!confirm('לבטל את כל השינויים ולחזור לגרסה השמורה?')) return;
    setFlowData(JSON.parse(JSON.stringify(originalFlowData)));
    setHasChanges(false);
    setFlowKey(k => k + 1);
  };

  const handleToggle = async () => {
    await updateFlow(flowId, { is_active: !currentFlow?.is_active });
  };

  const handleNameSave = async () => {
    if (flowName.trim() && flowName !== currentFlow?.name) {
      await updateFlow(flowId, { name: flowName.trim() });
    }
    setIsEditingName(false);
  };

  const handleBack = () => {
    if (hasChanges && !confirm('יש שינויים שלא נשמרו. לצאת בכל זאת?')) return;
    navigate('/flows');
  };

  if (!currentFlow || !flowData) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-500">טוען תהליך...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur border-b border-gray-200 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowRight className="w-5 h-5 text-gray-600" />
            </button>
            
            <div className="flex flex-col">
              {isEditingName ? (
                <input
                  type="text"
                  value={flowName}
                  onChange={(e) => setFlowName(e.target.value)}
                  onBlur={handleNameSave}
                  onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
                  className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none"
                  autoFocus
                />
              ) : (
                <button onClick={() => setIsEditingName(true)} className="flex items-center gap-2 hover:bg-gray-100 px-3 py-1 rounded-lg transition-colors">
                  <h1 className="font-semibold text-lg text-gray-800">{currentFlow.name}</h1>
                  <Edit2 className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
            
            {hasChanges && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-orange-500 bg-orange-50 px-2 py-1 rounded-full">
                  ⚠️ שינויים לא נשמרו
                </span>
                <button
                  onClick={handleDiscard}
                  className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"
                  title="בטל שינויים"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowStats(true)}
              className="flex items-center justify-center gap-2 h-10 px-4 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl font-medium transition-all"
            >
              <BarChart3 className="w-4 h-4" />
              <span>סטטיסטיקות</span>
            </button>
            
            <button
              onClick={handleToggle}
              className={`flex items-center justify-center gap-2 h-10 px-4 rounded-xl font-medium transition-all border ${
                currentFlow.is_active 
                  ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {currentFlow.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{currentFlow.is_active ? 'פעיל' : 'לא פעיל'}</span>
            </button>
            
            {hasChanges && (
              <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="flex items-center justify-center gap-2 h-10 px-5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'שומר...' : 'שמור'}</span>
              </button>
            )}
            
            {showSaved && !hasChanges && (
              <span className="text-xs text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                ✓ נשמר בהצלחה
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        {/* Right Panel - Editor or Palette */}
        <div className="w-96 flex-shrink-0 order-first h-full">
          {selectedNode ? (
            <NodeEditor
              node={selectedNode}
              onUpdate={handleNodeUpdate}
              onClose={() => setSelectedNodeId(null)}
              onDelete={handleNodeDelete}
            />
          ) : (
            <div className="h-full p-3 bg-white border-l border-gray-200 overflow-y-auto">
              <NodePalette onAddNode={handleAddNode} />
            </div>
          )}
        </div>

        {/* Canvas */}
        <div className="flex-1 m-4">
          <div className="h-full bg-white/50 backdrop-blur rounded-2xl border border-gray-200 shadow-inner overflow-hidden">
            <FlowBuilder 
              key={`${flowId}-${flowKey}`}
              initialData={flowData} 
              onChange={handleFlowChange}
              onNodeSelect={handleNodeSelect}
              onEdgeDelete={handleEdgeDelete}
            />
          </div>
        </div>
      </div>

      {/* Stats Modal */}
      {showStats && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-lg">סטטיסטיקות - {currentFlow?.name}</h2>
              </div>
              <button onClick={() => setShowStats(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 overflow-auto">
              {stats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-indigo-50 rounded-xl p-4 text-center">
                    <Users className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-indigo-700">{stats.total_participants || 0}</div>
                    <div className="text-sm text-indigo-500">משתתפים</div>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 text-center">
                    <Trophy className="w-6 h-6 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-700">{stats.total_cards || 0}</div>
                    <div className="text-sm text-green-500">כרטיסים</div>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-purple-700">{stats.total_shares || 0}</div>
                    <div className="text-sm text-purple-500">שיתופים</div>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-orange-700">{stats.saved_contacts || 0}</div>
                    <div className="text-sm text-orange-500">שמרו איש קשר</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">טוען...</div>
              )}
              
              {stats?.top10?.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold text-gray-700 mb-3">מובילי הכרטיסים</h3>
                  <div className="space-y-2">
                    {stats.top10.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between px-4 py-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-gray-400">{idx + 1}</span>
                          <span className="font-medium text-gray-700">{p.full_name || p.phone}</span>
                        </div>
                        <span className="font-bold text-indigo-600">{p.total_entries} כרטיסים</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getDefaultData(type) {
  switch (type) {
    case 'trigger':
      return { triggerType: 'message_received' };
    case 'message':
      return { message: '', messageType: 'text', buttons: [] };
    case 'condition':
      return { conditions: [], logic: 'and' };
    case 'database':
      return { actionType: 'sql_query', sql: '' };
    case 'delay':
      return { delay: 1, unit: 'seconds' };
    case 'action':
      return { actions: [] };
    default:
      return {};
  }
}
