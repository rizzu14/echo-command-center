import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout/Layout';
import { Dashboard } from './views/Dashboard/Dashboard';
import { AgentIntelligence } from './views/AgentIntelligence/AgentIntelligence';
import { ActionPipeline } from './views/ActionPipeline/ActionPipeline';
import { AgentNetwork } from './views/AgentNetwork/AgentNetwork';
import { Governance } from './views/Governance/Governance';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="agents" element={<AgentIntelligence />} />
          <Route path="actions" element={<ActionPipeline />} />
          <Route path="network" element={<AgentNetwork />} />
          <Route path="governance" element={<Governance />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
