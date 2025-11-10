import React, { useState } from 'react';
import SurfaceCard from './SurfaceCard';
import './FileUploadCard.css';

interface FileUploadCardProps {
  title: string;
  description: string;
  onFileSelected: (file: File) => Promise<void>;
  acceptedFormats?: string;
}

const FileUploadCard: React.FC<FileUploadCardProps> = ({
  title,
  description,
  onFileSelected,
  acceptedFormats = '.csv'
}) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setStatus('loading');
    setErrorMessage('');
    try {
      await onFileSelected(file);
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus('error');
      setErrorMessage('Unable to process the file. Please verify the structure and try again.');
    }
  };

  return (
    <SurfaceCard
      title={title}
      description={description}
      footer={
        <label className={`upload-button ${status}`}>
          <input type="file" accept={acceptedFormats} onChange={handleFileChange} />
          <span>{status === 'loading' ? 'Uploading…' : 'Select file'}</span>
        </label>
      }
    >
      <div className="upload-status">
        {status === 'idle' && <span>Awaiting upload</span>}
        {status === 'loading' && <span>Reading file…</span>}
        {status === 'success' && <span className="success">File loaded successfully</span>}
        {status === 'error' && <span className="error">{errorMessage}</span>}
      </div>
    </SurfaceCard>
  );
};

export default FileUploadCard;
