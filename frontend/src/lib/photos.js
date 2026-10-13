// Device photo access adapter for the web.
// Strategy:
//  1) If window.showOpenFilePicker is supported (desktop Chrome/Edge) use it.
//  2) Otherwise, use a hidden <input type="file" multiple accept="image/*">
//     — on iOS/Android this opens the native photo picker, letting the user
//     grant per-session access to all selected photos (equivalent to iOS
//     Limited Library permission).

const SAMPLE_URLS = [
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1554147090-e1221a04a025?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1416339442236-8ceb164046f8?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1511376777868-611b54f68947?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1522199873717-bc67b1a5e32b?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1493707553966-283afac8c358?auto=format&fit=crop&w=800&q=80',
];

export function supportsNativePicker() {
  return typeof window !== 'undefined' && 'showOpenFilePicker' in window;
}

function readImageDimensions(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: null, height: null });
    img.src = url;
  });
}

async function fileToPhoto(file, index) {
  const url = URL.createObjectURL(file);
  const { width, height } = await readImageDimensions(url);
  const creationTime =
    (file.lastModified && Number(file.lastModified)) || Date.now() - index * 1000;
  return {
    id: `local-${index}-${file.name}-${file.size}`,
    name: file.name,
    url,
    size: file.size,
    width,
    height,
    creationTime,
    source: 'device',
    favorite: false,
  };
}

export async function pickFromInput(inputEl) {
  const files = Array.from(inputEl.files || []).filter((f) => f.type.startsWith('image/'));
  const out = [];
  for (let i = 0; i < files.length; i++) {
    try {
      out.push(await fileToPhoto(files[i], i));
    } catch {
      /* skip unreadable file */
    }
  }
  return out;
}

export async function pickWithFileSystemAccess() {
  try {
    const handles = await window.showOpenFilePicker({
      multiple: true,
      types: [{ description: 'Photos', accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.gif'] } }],
    });
    const files = await Promise.all(handles.map((h) => h.getFile()));
    const out = [];
    for (let i = 0; i < files.length; i++) {
      out.push(await fileToPhoto(files[i], i));
    }
    return out;
  } catch (err) {
    if (err && err.name === 'AbortError') return [];
    throw err;
  }
}

export async function loadSamplePhotos() {
  const now = Date.now();
  const out = SAMPLE_URLS.map((url, i) => ({
    id: `sample-${i}`,
    name: `sample-${i + 1}.jpg`,
    url,
    // Simulate realistic photo sizes between 1.2MB and 5.4MB
    size: 1_200_000 + ((i * 377) % 4_200_000),
    width: 1600,
    height: 2000,
    creationTime: now - (i % 4) * 20_000 - Math.floor(i / 4) * 86_400_000,
    source: 'sample',
    favorite: false,
  }));
  return out;
}

export function haptic(pattern = [40]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(pattern); } catch { /* ignore */ }
  }
}
