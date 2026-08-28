import * as THREE from 'three';
import { HeartObject, HeartObjectType } from '../../core/experience/experience-state.types';
import { heartAssetKey } from '../../core/experience/heart-asset.types';
import { acquireTexture, disposeAllCachedTextures, releaseTextureFromMap } from '../../core/three/texture-cache';

export function objectKey(obj: HeartObject): string {
  return heartAssetKey(obj.type, obj.referenceId);
}

export function loadTexture(url: string, maxSize = 256): Promise<THREE.Texture> {
  return acquireTexture(url, maxSize);
}

export function createTextTexture(
  text: string,
  options: { width?: number; height?: number; fontSize?: number; color?: string } = {}
): THREE.CanvasTexture {
  const width = options.width ?? 256;
  const height = options.height ?? 128;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(10, 6, 16, 0.85)';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(201, 160, 168, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, width - 8, height - 8);
  ctx.fillStyle = options.color ?? '#f5f0e8';
  ctx.font = `${options.fontSize ?? 22}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = wrapText(ctx, text, width - 24);
  const lineHeight = (options.fontSize ?? 22) * 1.2;
  const startY = height / 2 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, i) => ctx.fillText(line, width / 2, startY + i * lineHeight));
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

export async function buildObjectMesh(
  obj: HeartObject,
  quality: 'mobile' | 'desktop'
): Promise<THREE.Group> {
  const group = new THREE.Group();
  group.userData['key'] = objectKey(obj);
  group.userData['type'] = obj.type;
  group.userData['label'] = obj.label ?? obj.type;

  switch (obj.type) {
    case 'photo':
      await addPhotoMesh(group, obj, quality);
      break;
    case 'memory':
      await addMemoryMesh(group, obj, quality);
      break;
    case 'quote':
      addQuoteMesh(group, obj);
      break;
    case 'reason':
      addReasonMesh(group, obj);
      break;
    case 'flower':
      addFlowerMesh(group);
      break;
    case 'love-bomb':
      addLoveBombMesh(group);
      break;
    case 'secret':
      addSecretMesh(group);
      break;
    default:
      addSymbolMesh(group, obj.type);
  }

  return group;
}

async function addPhotoMesh(
  group: THREE.Group,
  obj: HeartObject,
  quality: 'mobile' | 'desktop'
): Promise<void> {
  const w = quality === 'mobile' ? 0.22 : 0.26;
  const h = w * 1.15;
  const depth = 0.025;
  const maxTex = quality === 'mobile' ? 256 : 512;

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.02, h + 0.02, depth * 0.6),
    new THREE.MeshStandardMaterial({
      color: 0x1a1018,
      metalness: 0.4,
      roughness: 0.5
    })
  );
  group.add(frame);

  const url = obj.thumbnailUrl ?? obj.imageUrl;
  let frontMat: THREE.Material;
  if (url) {
    try {
      const tex = await loadTexture(url, maxTex);
      frontMat = new THREE.MeshStandardMaterial({
        map: tex,
        metalness: 0.05,
        roughness: 0.85
      });
    } catch {
      frontMat = placeholderMat(0xc4b08a);
    }
  } else {
    frontMat = placeholderMat(0xc4b08a);
  }

  const photo = new THREE.Mesh(new THREE.BoxGeometry(w, h, depth), [
    new THREE.MeshStandardMaterial({ color: 0x1a1018 }),
    new THREE.MeshStandardMaterial({ color: 0x1a1018 }),
    new THREE.MeshStandardMaterial({ color: 0x1a1018 }),
    new THREE.MeshStandardMaterial({ color: 0x1a1018 }),
    frontMat,
    new THREE.MeshStandardMaterial({ color: 0x120810 })
  ]);
  photo.position.z = depth * 0.15;
  group.add(photo);
}

async function addMemoryMesh(
  group: THREE.Group,
  obj: HeartObject,
  quality: 'mobile' | 'desktop'
): Promise<void> {
  const w = quality === 'mobile' ? 0.2 : 0.24;
  const h = w * 0.85;
  const maxTex = quality === 'mobile' ? 256 : 384;

  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(w + 0.04, h + 0.04),
    new THREE.MeshBasicMaterial({
      color: 0xc9a0a8,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide
    })
  );
  group.add(glow);

  const url = obj.thumbnailUrl ?? obj.imageUrl;
  if (url) {
    try {
      const tex = await loadTexture(url, maxTex);
      const img = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 })
      );
      img.position.z = 0.01;
      group.add(img);
    } catch {
      addMemorySymbol(group, obj, w, h);
    }
  } else {
    addMemorySymbol(group, obj, w, h);
  }
}

function addMemorySymbol(group: THREE.Group, obj: HeartObject, w: number, h: number): void {
  const tex = createTextTexture(obj.label ?? 'Memory', { fontSize: 18, width: 200, height: 100 });
  const card = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ map: tex, transparent: true })
  );
  card.position.z = 0.01;
  group.add(card);
}

function addQuoteMesh(group: THREE.Group, obj: HeartObject): void {
  const text = (obj.label ?? obj.metadata?.['short'] ?? '...').slice(0, 48);
  const tex = createTextTexture(`"${text}"`, { fontSize: 20, width: 240, height: 96 });
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.28, 0.12),
    new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      emissive: 0xf5f0e8,
      emissiveIntensity: 0.08
    })
  );
  group.add(mesh);
}

function addReasonMesh(group: THREE.Group, obj: HeartObject): void {
  const text = (obj.label ?? '...').slice(0, 24);
  const tex = createTextTexture(text, { fontSize: 24, width: 200, height: 80, color: '#e8d4d8' });
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.22, 0.09),
    new THREE.MeshStandardMaterial({ map: tex, transparent: true })
  );
  group.add(mesh);
}

function addFlowerMesh(group: THREE.Group): void {
  const petalMat = new THREE.MeshStandardMaterial({
    color: 0xc9a0a8,
    emissive: 0x4a2030,
    emissiveIntensity: 0.2,
    roughness: 0.6
  });
  for (let i = 0; i < 5; i++) {
    const petal = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), petalMat);
    const a = (i / 5) * Math.PI * 2;
    petal.position.set(Math.cos(a) * 0.05, Math.sin(a) * 0.05, 0);
    petal.scale.set(1, 0.5, 0.3);
    group.add(petal);
  }
  const center = new THREE.Mesh(
    new THREE.SphereGeometry(0.025, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xf5e6c8, emissive: 0x3a2810, emissiveIntensity: 0.3 })
  );
  group.add(center);
}

function addLoveBombMesh(group: THREE.Group): void {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 12, 12),
    new THREE.MeshStandardMaterial({
      color: 0xd4b0b8,
      emissive: 0xc9a0a8,
      emissiveIntensity: 0.45,
      metalness: 0.2,
      roughness: 0.4
    })
  );
  group.add(mesh);
}

function addSecretMesh(group: THREE.Group): void {
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 10, 10),
    new THREE.MeshStandardMaterial({
      color: 0x9a8fa8,
      emissive: 0x6a5088,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.85
    })
  );
  group.add(core);
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.04, 0.07, 16),
    new THREE.MeshBasicMaterial({
      color: 0xc9a0a8,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    })
  );
  group.add(halo);
}

function addSymbolMesh(group: THREE.Group, type: HeartObjectType): void {
  const mesh = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.05, 0),
    new THREE.MeshStandardMaterial({
      color: 0xc4b08a,
      emissive: 0x3a2818,
      emissiveIntensity: 0.25
    })
  );
  mesh.userData['type'] = type;
  group.add(mesh);
}

function placeholderMat(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.15,
    roughness: 0.7
  });
}

/**
 * Dispose OWNED geometry/materials on a group.
 * SHARED cached textures are released (ref-counted), never directly disposed.
 * OWNED canvas textures (no cacheKey) are disposed directly.
 */
export function disposeGroup(group: THREE.Group): void {
  group.traverse(child => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach(m => {
        if ('map' in m && m.map) releaseTextureFromMap(m.map as THREE.Texture);
        m.dispose();
      });
    }
  });
}

/** @deprecated Use disposeGroup per-scene; only call on full app teardown. */
export function disposeAllTextures(): void {
  disposeAllCachedTextures();
}
