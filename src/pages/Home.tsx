import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import SurfaceCard from '../components/SurfaceCard';
import './Home.css';

const Home: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Layout>
      <PageHeader
        title="Wallet intelligence toolkit"
        subtitle="Upload leaderboards and craft filters to uncover anomalous account behaviour."
      />
      <section className="home-grid">
        <SurfaceCard
          asButton
          onClick={() => navigate('/upload')}
          title="Upload datasets"
          description="Import the latest leaderboard snapshots, column descriptions and aggregated metrics."
          icon={<span>📁</span>}
          footer={<span>CSV files • secure local processing</span>}
        />
        <SurfaceCard
          asButton
          onClick={() => navigate('/find-accounts')}
          title="Find accounts"
          description="Stack intuitive filters across any metric and export the reduced dataset for deeper analysis."
          icon={<span>🔎</span>}
          footer={<span>Build multi-step filters • export CSV</span>}
        />
      </section>
    </Layout>
  );
};

export default Home;
