import { File } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as LegacyMediaLibrary from 'expo-media-library/legacy';
import { Platform } from 'react-native';
import { Asset, AssetField, MediaType, Query } from 'expo-media-library';
import type { PhotoMetadata, PhotoPermission } from './photo-library.types';

function toPermission(response: MediaLibrary.PermissionResponse): PhotoPermission {
  return {
    granted: response.granted,
    canAskAgain: response.canAskAgain,
    status: String(response.status),
    accessPrivileges: response.accessPrivileges,
  };
}

export async function getPhotoPermission(): Promise<PhotoPermission> {
  return toPermission(await MediaLibrary.getPermissionsAsync(false, ['photo']));
}

export async function requestPhotoAccess(): Promise<PhotoPermission> {
  return toPermission(await MediaLibrary.requestPermissionsAsync(false, ['photo']));
}

export async function queryPhotoPage(offset: number, limit: number): Promise<PhotoMetadata[]> {
  const assets = await new Query()
    .eq(AssetField.MEDIA_TYPE, MediaType.IMAGE)
    .orderBy({ key: AssetField.CREATION_TIME, ascending: false })
    .offset(offset)
    .limit(limit)
    .exeForMetadata();

  return assets.map((asset) => ({ ...asset, fileSize: null }));
}

export async function queryVideoPage(offset: number, limit: number): Promise<PhotoMetadata[]> {
  const assets = await new Query()
    .eq(AssetField.MEDIA_TYPE, MediaType.VIDEO)
    .orderBy({ key: AssetField.CREATION_TIME, ascending: false })
    .offset(offset)
    .limit(limit)
    .exeForMetadata();

  return assets.map((asset) => ({ ...asset, fileSize: null }));
}

export async function queryScreenshotPhotos(limit = 240): Promise<PhotoMetadata[]> {
  if (Platform.OS !== 'ios') return [];
  const page = await LegacyMediaLibrary.getAssetsAsync({
    first: limit,
    mediaType: ['photo'],
    mediaSubtypes: ['screenshot'],
  });
  return page.assets.map((asset) => ({
    id: asset.id,
    filename: asset.filename,
    width: asset.width || null,
    height: asset.height || null,
    creationTime: asset.creationTime || null,
    isFavorite: false,
    fileSize: null,
    isScreenshot: true,
  }));
}

export async function getLocalPhotoFileSize(id: string): Promise<number | null> {
  try {
    const uri = await new Asset(id).getUri();
    const size = new File(uri).size;
    return typeof size === 'number' && size > 0 ? size : null;
  } catch {
    return null;
  }
}

export async function presentLimitedPhotoPicker() {
  await MediaLibrary.presentPermissionsPicker(['photo']);
}

export async function deletePhotos(ids: string[]) {
  await Asset.delete(ids.map((id) => new Asset(id)));
}

export async function setPhotoFavorite(id: string, isFavorite: boolean) {
  await new Asset(id).setFavorite(isFavorite);
}
