export type PhotoPermission = {
  granted: boolean;
  canAskAgain: boolean;
  status: string;
  accessPrivileges?: 'all' | 'limited' | 'none';
};

export type PhotoMetadata = {
  id: string;
  filename: string | null;
  width: number | null;
  height: number | null;
  creationTime: number | null;
  isFavorite: boolean;
  fileSize: number | null;
  isScreenshot?: boolean;
};
