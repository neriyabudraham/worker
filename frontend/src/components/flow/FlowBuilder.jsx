import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { TriggerNode, MessageNode, ConditionNode, DatabaseNode, DelayNode, ActionNode } from './nodes';

const nodeTypes = {
  trigger: TriggerNode,
  message: MessageNode,
  condition: ConditionNode,
  database: DatabaseNode,
  delay: DelayNode,
  action: ActionNode,
};

function FlowBuilderInner({ initialData, onChange, onNodeSelect, onEdgeDelete }) {
  const reactFlowWrapper = useRef(null);
  const { screenToFlowPosition } = useReactFlow();
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialData?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData?.edges || []);

  useEffect(() => {
    onChange?.({ nodes, edges });
  }, [nodes, edges]);

  const handleDeleteNode = useCallback((nodeId) => {
    setNodes(nds => nds.filter(n => n.id !== nodeId));
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
  }, [setNodes, setEdges]);

  const handleDuplicateNode = useCallback((nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || node.type === 'trigger') return;
    
    const newNode = {
      ...node,
      id: `${node.type}_${Date.now()}`,
      position: { x: node.position.x + 50, y: node.position.y + 50 },
      data: { ...node.data },
      selected: false,
    };
    
    setNodes(nds => [...nds, newNode]);
  }, [nodes, setNodes]);

  const handleDeleteEdge = useCallback((edgeId) => {
    setEdges(eds => eds.filter(e => e.id !== edgeId));
    onEdgeDelete?.(edgeId);
  }, [setEdges, onEdgeDelete]);

  const nodesWithCallbacks = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        onEdit: () => onNodeSelect?.(node),
        onDelete: () => handleDeleteNode(node.id),
        onDuplicate: () => handleDuplicateNode(node.id),
      }
    }));
  }, [nodes, onNodeSelect, handleDeleteNode, handleDuplicateNode]);

  const edgesWithCallbacks = useMemo(() => {
    return edges.map(edge => ({
      ...edge,
      data: { 
        ...edge.data, 
        onDelete: () => handleDeleteEdge(edge.id) 
      }
    }));
  }, [edges, handleDeleteEdge]);

  const onConnect = useCallback(
    (params) => {
      setEdges((eds) => addEdge({
        ...params,
        type: 'default',
        markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15 },
      }, eds));
    },
    [setEdges]
  );

  const onNodeClick = useCallback((event, node) => {
    const currentNode = nodes.find(n => n.id === node.id) || node;
    onNodeSelect?.(currentNode);
  }, [nodes, onNodeSelect]);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type || !reactFlowWrapper.current) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNodeId = `${type}_${Date.now()}`;
      const newNode = {
        id: newNodeId,
        type,
        position,
        data: getDefaultData(type),
      };
      
      setNodes((nds) => [...nds, newNode]);
      
      setTimeout(() => {
        onNodeSelect?.({ ...newNode });
      }, 50);
    },
    [screenToFlowPosition, setNodes, onNodeSelect]
  );

  return (
    <div className="h-full relative" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodesWithCallbacks}
        edges={edgesWithCallbacks}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[20, 20]}
        defaultEdgeOptions={{
          type: 'default',
          animated: true,
          style: { strokeWidth: 2, stroke: '#94a3b8' },
          markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color: '#94a3b8' },
        }}
        proOptions={{ hideAttribution: true }}
        connectionLineStyle={{ strokeWidth: 2, stroke: '#94a3b8' }}
        connectionLineType="bezier"
        minZoom={0.3}
        maxZoom={2}
        deleteKeyCode={['Backspace', 'Delete']}
      >
        <Background color="#cbd5e1" gap={15} size={1.5} />
        <Controls 
          position="bottom-left" 
          showInteractive={false}
          className="!bg-white !rounded-xl !border !border-gray-200 !shadow-lg"
        />
        <MiniMap 
          className="!bg-white !rounded-xl !border !border-gray-200 !shadow-lg"
          style={{ width: 150, height: 100 }}
          nodeColor={(n) => {
            const colors = {
              trigger: '#a855f7',
              message: '#14b8a6',
              condition: '#f97316',
              database: '#22c55e',
              delay: '#3b82f6',
              action: '#ec4899',
            };
            return colors[n.type] || '#6b7280';
          }}
          nodeStrokeWidth={0}
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
}

export default function FlowBuilder(props) {
  return (
    <ReactFlowProvider>
      <FlowBuilderInner {...props} />
    </ReactFlowProvider>
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
