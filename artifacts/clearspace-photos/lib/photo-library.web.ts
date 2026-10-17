import type { PhotoMetadata, PhotoPermission } from './photo-library.types';

export async function getPhotoPermission(): Promise<PhotoPermission> {
  return { granted: false, canAskAgain: false, status: 'denied', accessPrivileges: 'none' };
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
