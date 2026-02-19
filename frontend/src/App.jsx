import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import FlowsPage from './pages/FlowsPage';
import FlowEditorPage from './pages/FlowEditorPage';

function App() {
  return (
    <Router basename="/builder">
      <Routes>
        <Route path="/flows" element={<FlowsPage />} />
        <Route path="/flows/:flowId" element={<FlowEditorPage />} />
        <Route path="*" element={<Navigate to="/flows" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
