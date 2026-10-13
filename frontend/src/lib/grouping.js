// Burst / similar-moments grouping — mirrors the native app's rule set:
//  * same aspect ratio (within 12%)
//  * taken within 90s of previous, and group spans at most 180s
// Falls back to equal-sized chunks when timestamps are not available
// (common with web File inputs that strip EXIF).

const BURST_WINDOW_MS = 90_000;
const MAX_GROUP_SPAN_MS = 180_000;
const ASPECT_RATIO_TOLERANCE = 0.12;

function aspectRatio(p) {
  if (!p.width || !p.height) return 0;
  return Math.min(p.width, p.height) / Math.max(p.width, p.height);
}

function rankPhotos(photos) {
  return [...photos].sort((a, b) => {
    if (!!a.favorite !== !!b.favorite) return a.favorite ? -1 : 1;
    const aPx = (a.width ?? 0) * (a.height ?? 0);
    const bPx = (b.width ?? 0) * (b.height ?? 0);
    if (aPx !== bPx) return bPx - aPx;
    return (b.size ?? 0) - (a.size ?? 0);
  });
}

export function groupSimilarPhotos(photos) {
  if (!photos.length) return [];
  const havingTime = photos.filter((p) => typeof p.creationTime === 'number');

  // If no timestamps at all (common for web files without EXIF), chunk by 3-4 photos.
  if (havingTime.length < photos.length * 0.3) {
    const groups = [];
    const CHUNK = 4;
    for (let i = 0; i < photos.length; i += CHUNK) {
      const slice = photos.slice(i, i + CHUNK);
      if (slice.length > 1) {
        groups.push({ id: `grp-${i}`, photos: rankPhotos(slice) });
      } else if (slice.length === 1) {
        // keep single photos as their own set so they still get reviewed
        groups.push({ id: `grp-${i}`, photos: slice });
      }
    }
    return groups;
  }

  const sorted = [...havingTime].sort((a, b) => a.creationTime - b.creationTime);
  const groups = [];
  let current = [];
  const flush = () => {
    if (current.length) groups.push({ id: `grp-${groups.length}`, photos: rankPhotos(current) });
    current = [];
  };

  for (const p of sorted) {
    const prev = current[current.length - 1];
    if (!prev) {
      current = [p];
      continue;
    }
    const elapsed = p.creationTime - prev.creationTime;
    const span = p.creationTime - current[0].creationTime;
    const ratioDelta = Math.abs(aspectRatio(p) - aspectRatio(prev));
    if (elapsed <= BURST_WINDOW_MS && span <= MAX_GROUP_SPAN_MS && ratioDelta <= ASPECT_RATIO_TOLERANCE) {
      current.push(p);
    } else {
      flush();
      current = [p];
    }
  }
  flush();

  // Also add photos without timestamps as their own small chunks at the end.
  const noTime = photos.filter((p) => typeof p.creationTime !== 'number');
  const CHUNK = 4;
  for (let i = 0; i < noTime.length; i += CHUNK) {
    const slice = noTime.slice(i, i + CHUNK);
    if (slice.length)
      groups.push({ id: `grp-nt-${i}`, photos: rankPhotos(slice) });
  }

  return groups.sort(
    (a, b) => (b.photos[0]?.creationTime ?? 0) - (a.photos[0]?.creationTime ?? 0),
  );
}
