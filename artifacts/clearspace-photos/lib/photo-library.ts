import type { PhotoMetadata, PhotoPermission } from './photo-library.types';

// Metro selects the platform-specific implementation for native devices and web.
// This fallback exists to provide a stable TypeScript contract for those files.
export async function getPhotoPermission(): Promise<PhotoPermission> {
  return { granted: false, canAskAgain: false, status: 'unsupported', accessPrivileges: 'none' };
}

export async function requestPhotoAccess(): Promise<PhotoPermission> {
  return getPhotoPermission();
}

export async function queryPhotoPage(_offset: number, _limit: number): Promise<PhotoMetadata[]> {
  return [];
}

export async function queryVideoPage(_offset: number, _limit: number): Promise<PhotoMetadata[]> {
  return [];
}

export async function queryScreenshotPhotos(_limit = 240): Promise<PhotoMetadata[]> {
  return [];
}

export async function getLocalPhotoFileSize(_id: string): Promise<number | null> {
  return null;
}

export async function presentLimitedPhotoPicker() {
  return;
}

export async function deletePhotos(_ids: string[]) {
  return;
}

export async function setPhotoFavorite(_id: string, _isFavorite: boolean) {
  return;
}
