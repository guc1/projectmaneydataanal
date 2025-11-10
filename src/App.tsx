import React from 'react';
import { Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import UploadPage from './pages/UploadPage';
import FindAccountsPage from './pages/FindAccountsPage';
import { DataProvider } from './context/DataContext';

const App: React.FC = () => {
  return (
    <DataProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/find-accounts" element={<FindAccountsPage />} />
      </Routes>
    </DataProvider>
  );
};

export default App;
