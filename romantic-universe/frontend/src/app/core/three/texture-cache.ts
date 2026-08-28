import * as THREE from 'three';

interface CacheEntry {
  texture: THREE.Texture | null;
  refCount: number;
  loading?: Promise<THREE.Texture>;
}

const cache = new Map<string, CacheEntry>();
const textureLoader = new THREE.TextureLoader();

/** Reference-counted texture cache. Acquire on load, release on dispose — never dispose shared textures directly. */
export function acquireTexture(url: string, maxSize = 256): Promise<THREE.Texture> {
  let entry = cache.get(url);
  if (entry?.texture) {
    entry.refCount++;
    return Promise.resolve(entry.texture);
  }
  if (entry?.loading) {
    return entry.loading.then(tex => {
      const current = cache.get(url);
      if (current?.texture) {
        current.refCount++;
        return current.texture;
      }
      return tex;
    });
  }

  const loading = loadDownscaledTexture(url, maxSize).then(texture => {
    texture.userData['cacheKey'] = url;
    const current = cache.get(url);
    if (current) {
      current.texture = texture;
      current.refCount = 1;
      delete current.loading;
    }
    return texture;
  });

  cache.set(url, { texture: null, refCount: 0, loading });
  return loading;
}

export function releaseTexture(url: string): void {
  const entry = cache.get(url);
  if (!entry) return;
  entry.refCount = Math.max(0, entry.refCount - 1);
  if (entry.refCount === 0 && entry.texture) {
    entry.texture.dispose();
    cache.delete(url);
  }
}

/** Release a cached texture from a material map, or dispose owned canvas textures. */
export function releaseTextureFromMap(map: THREE.Texture | null | undefined): void {
  if (!map) return;
  const key = map.userData['cacheKey'] as string | undefined;
  if (key) {
    releaseTexture(key);
  } else {
    map.dispose();
  }
}

/** Force-clear entire cache — only for full app teardown when no scenes remain. */
export function disposeAllCachedTextures(): void {
  cache.forEach(entry => entry.texture?.dispose());
  cache.clear();
}

export function getTextureRefCount(url: string): number {
  return cache.get(url)?.refCount ?? 0;
}

async function loadDownscaledTexture(url: string, maxSize: number): Promise<THREE.Texture> {
  try {
    const image = await loadImageElement(url);
    const { width, height } = fitWithin(image.naturalWidth || image.width, image.naturalHeight || image.height, maxSize);

    if (width === image.naturalWidth && height === image.naturalHeight) {
      const texture = await new Promise<THREE.Texture>((resolve, reject) => {
        textureLoader.load(url, resolve, undefined, reject);
      });
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      return texture;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2d unavailable');
    ctx.drawImage(image, 0, 0, width, height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return texture;
  } catch {
    return new Promise<THREE.Texture>((resolve, reject) => {
      textureLoader.load(
        url,
        texture => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = 4;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          resolve(texture);
        },
        undefined,
        reject
      );
    });
  }
}

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

function fitWithin(w: number, h: number, maxSize: number): { width: number; height: number } {
  if (w <= 0 || h <= 0) return { width: maxSize, height: maxSize };
  const scale = Math.min(1, maxSize / Math.max(w, h));
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale))
  };
}
