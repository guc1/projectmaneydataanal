export type UploadSlotKey = 'dataset' | 'dictionary' | 'summary';

export type StoredUploadPayload = {
  name: string;
  content: string;
  mimeType?: string;
  updatedAt: number;
};
