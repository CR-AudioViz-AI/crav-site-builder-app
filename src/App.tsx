import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WebsiteBuilderNorthStar } from './components/website/WebsiteBuilderNorthStar';
import { PreviewPage } from './pages/PreviewPage';
import { DashboardPage } from './pages/DashboardPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WebsiteBuilderNorthStar />} />
        <Route path="/preview/:siteId" element={<PreviewPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
