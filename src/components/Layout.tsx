import React from 'react';
import { NavLink } from 'react-router-dom';
import './Layout.css';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">Polymarket Analyzer</div>
        <nav>
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            Home
          </NavLink>
          <NavLink to="/upload" className={({ isActive }) => (isActive ? 'active' : '')}>
            Upload Data
          </NavLink>
          <NavLink to="/find-accounts" className={({ isActive }) => (isActive ? 'active' : '')}>
            Find Accounts
          </NavLink>
        </nav>
      </aside>
      <main className="content-area">{children}</main>
    </div>
  );
};

export default Layout;
