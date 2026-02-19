import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, GitBranch, Play, Pause, Trash2, Edit2, X, Users, 
  BarChart3, Search, Trophy, ArrowLeft
} from 'lucide-react';
import useFlowsStore from '../store/flowsStore';
import api from '../services/api';

export default function FlowsPage() {
  const navigate = useNavigate();
  const { flows, fetchFlows, createFlow, updateFlow, deleteFlow } = useFlowsStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newFlowName, setNewFlowName] = useState('');
  const [newFlowType, setNewFlowType] = useState('raffle');
  const [searchQuery, setSearchQuery] = useState('');
  const [flowStats, setFlowStats] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    fetchFlows();
  }, []);

  useEffect(() => {
    flows.forEach(async (flow) => {
      try {
        const res = await api.get(`/flows/${flow.id}/stats`);
        setFlowStats(prev => ({ ...prev, [flow.id]: res.data }));
      } catch (e) {}
    });
  }, [flows]);

  const handleCreate = async () => {
    if (!newFlowName.trim()) return;
    try {
      const flow = await createFlow(newFlowName.trim(), newFlowType);
      setNewFlowName('');
      setShowCreate(false);
      navigate(`/flows/${flow.id}`);
    } catch (err) {
      alert('שגיאה ביצירת תהליך');
    }
  };

  const handleToggle = async (e, flow) => {
    e.stopPropagation();
    await updateFlow(flow.id, { is_active: !flow.is_active });
  };

  const handleDeleteClick = (e, flow) => {
    e.stopPropagation();
    setDeleteTarget(flow);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteFlow(deleteTarget.id);
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  };

  const filteredFlows = flows.filter(flow => 
    flow.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeFlows = flows.filter(f => f.is_active).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50" dir="rtl">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <a href="/" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </a>
              <div className="h-8 w-px bg-gray-200" />
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
                  <GitBranch className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-xl text-gray-900">בונה תהליכים</h1>
                  <p className="text-sm text-gray-500">יצירה ועריכת בוטים</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-500 rounded-3xl p-8 mb-8">
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-white/20 backdrop-blur rounded-2xl">
                    <Trophy className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white">תהליכי הגרלה</h1>
                    <p className="text-white/70">בנה תהליכים אוטומטיים בקלות</p>
                  </div>
                </div>
                
                {/* Quick Stats */}
                <div className="flex items-center gap-6 mt-6">
                  <div className="flex items-center gap-2 text-white/90">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <GitBranch className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{flows.length}</div>
                      <div className="text-xs text-white/60">תהליכים</div>
                    </div>
                  </div>
                  <div className="h-10 w-px bg-white/20" />
                  <div className="flex items-center gap-2 text-white/90">
                    <div className="p-2 bg-green-400/30 rounded-lg">
                      <Play className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{activeFlows}</div>
                      <div className="text-xs text-white/60">פעילים</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                <Plus className="w-5 h-5" />
                תהליך חדש
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center justify-between mb-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חיפוש תהליך..."
              className="w-64 pr-10 pl-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
            />
          </div>
        </div>

        {/* Flows Grid */}
        {filteredFlows.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <GitBranch className="w-12 h-12 text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {searchQuery ? 'לא נמצאו תוצאות' : 'אין תהליכים עדיין'}
            </h3>
            <p className="text-gray-500 mb-8 max-w-sm mx-auto">
              {searchQuery ? 'נסה לחפש במילים אחרות' : 'צור את התהליך הראשון שלך'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                <Plus className="w-5 h-5" />
                צור תהליך ראשון
              </button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredFlows.map((flow) => {
              const stats = flowStats[flow.id] || {};
              return (
                <div
                  key={flow.id}
                  onClick={() => navigate(`/flows/${flow.id}`)}
                  className="group relative bg-white rounded-2xl border border-gray-100 hover:border-indigo-200 shadow-sm hover:shadow-xl transition-all cursor-pointer overflow-hidden"
                >
                  {/* Status indicator */}
                  <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-medium ${
                    flow.is_active 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {flow.is_active ? '● פעיל' : '○ טיוטה'}
                  </div>
                  
                  {/* Header */}
                  <div className="p-6 pb-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                        flow.is_active 
                          ? 'bg-gradient-to-br from-indigo-500 to-purple-600' 
                          : 'bg-gray-100'
                      }`}>
                        <Trophy className={`w-7 h-7 ${flow.is_active ? 'text-white' : 'text-gray-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-lg truncate">{flow.name}</h3>
                        <p className="text-sm text-gray-500 truncate mt-1">
                          {flow.type === 'raffle' ? 'הגרלה' : flow.type}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Stats */}
                  <div className="px-6 py-4 bg-gradient-to-b from-gray-50/50 to-gray-50 border-t border-gray-100">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                          <Users className="w-3.5 h-3.5" />
                        </div>
                        <div className="font-bold text-gray-900">{stats.total_participants || 0}</div>
                        <div className="text-xs text-gray-400">משתתפים</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                          <BarChart3 className="w-3.5 h-3.5" />
                        </div>
                        <div className="font-bold text-gray-900">{stats.total_cards || 0}</div>
                        <div className="text-xs text-gray-400">כרטיסים</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleToggle(e, flow)}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        flow.is_active 
                          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' 
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {flow.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      {flow.is_active ? 'השהה' : 'הפעל'}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/flows/${flow.id}`); }}
                      className="p-2 bg-indigo-100 text-indigo-600 hover:bg-indigo-200 rounded-lg transition-colors"
                      title="עריכה"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteClick(e, flow)}
                      className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors"
                      title="מחיקה"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
            
            {/* Create New Card */}
            <div
              onClick={() => setShowCreate(true)}
              className="group relative bg-gradient-to-br from-gray-50 to-white rounded-2xl border-2 border-dashed border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer flex items-center justify-center min-h-[280px]"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 group-hover:bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors">
                  <Plus className="w-8 h-8 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                </div>
                <div className="font-semibold text-gray-600 group-hover:text-indigo-600 transition-colors">צור תהליך חדש</div>
                <div className="text-sm text-gray-400 mt-1">לחץ להתחלה</div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">יצירת תהליך חדש</h2>
                  <p className="text-sm text-gray-500">התחל לבנות הגרלה</p>
                </div>
              </div>
              <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">שם התהליך</label>
                <input
                  type="text"
                  value={newFlowName}
                  onChange={(e) => setNewFlowName(e.target.value)}
                  placeholder="לדוגמה: הגרלת חנוכה 2026"
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all text-lg"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">סוג תהליך</label>
                <select
                  value={newFlowType}
                  onChange={(e) => setNewFlowType(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                >
                  <option value="raffle">🎁 הגרלה</option>
                  <option value="support">💬 תמיכה</option>
                  <option value="marketing">📣 שיווק</option>
                  <option value="custom">⚙️ מותאם אישית</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setShowCreate(false)} 
                className="flex-1 px-6 py-3.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                ביטול
              </button>
              <button 
                onClick={handleCreate} 
                disabled={!newFlowName.trim()}
                className="flex-1 px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                צור תהליך
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">מחיקת תהליך</h3>
              <p className="text-gray-500 mb-6">
                האם למחוק את <span className="font-bold">"{deleteTarget.name}"</span>?
                <br />
                <span className="text-red-500 text-sm">פעולה זו לא ניתנת לביטול</span>
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDeleteConfirm(false)} 
                className="flex-1 px-6 py-3.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
              >
                ביטול
              </button>
              <button 
                onClick={handleDeleteConfirm}
                className="flex-1 px-6 py-3.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
              >
                מחק
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
