import React from 'react';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import FileUploadCard from '../components/FileUploadCard';
import { useDataContext } from '../context/DataContext';
import './UploadPage.css';

const UploadPage: React.FC = () => {
  const { loadDataset, loadMetadata, loadSummary, reset, isReady, records, metadata } = useDataContext();

  return (
    <Layout>
      <PageHeader
        title="Upload your data"
        subtitle="All files are processed in-browser. Upload new snapshots at any time to refresh the workspace."
        actions={
          <button type="button" className="ghost-button" onClick={reset}>
            Reset workspace
          </button>
        }
      />
      <section className="upload-grid">
        <FileUploadCard
          title="Account leaderboard"
          description="Upload the CSV export that contains each wallet and every metric you want to explore."
          onFileSelected={loadDataset}
        />
        <FileUploadCard
          title="Column dictionary"
          description="Provide the CSV with metric explanations so we can display context-rich tooltips."
          onFileSelected={loadMetadata}
        />
        <FileUploadCard
          title="Averages & medians"
          description="Load the CSV containing aggregated rows (average, median) to power filter guidance."
          onFileSelected={loadSummary}
        />
      </section>
      <section className="upload-status-grid">
        <div>
          <h3>Dataset status</h3>
          <p>{records.length ? `${records.length.toLocaleString()} records ready` : 'No account data loaded yet.'}</p>
        </div>
        <div>
          <h3>Metadata</h3>
          <p>{metadata.length ? `${metadata.length} metrics described` : 'Upload the column dictionary to unlock tooltips.'}</p>
        </div>
        <div>
          <h3>Workspace readiness</h3>
          <p>{isReady ? 'All set! Jump into Find Accounts to start filtering.' : 'Waiting for both data and metadata uploads.'}</p>
        </div>
      </section>
    </Layout>
  );
};

export default UploadPage;
