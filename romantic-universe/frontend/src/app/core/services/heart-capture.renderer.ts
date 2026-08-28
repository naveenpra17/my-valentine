import * as THREE from 'three';
import { HeartObject } from '../experience/experience-state.types';
import { createHeartLatheGeometry, createHeartMaterial } from '../../features/finale/heart-geometry.util';
import { buildObjectMesh, disposeGroup } from '../../features/our-little-heart/heart-object-meshes';

export interface HeartCaptureOptions {
  width?: number;
  height?: number;
  herName?: string;
  title?: string;
}

/**
 * Offscreen renderer — reconstructs exact heart from serializable state and captures a snapshot.
 * Does not persist WebGL objects; disposes after capture.
 */
export async function renderHeartSnapshot(
  objects: HeartObject[],
  options: HeartCaptureOptions = {}
): Promise<HTMLCanvasElement> {
  const width = options.width ?? 1080;
  const height = options.height ?? 1080;
  const title = options.title ?? 'Our Little Heart';
  const herName = options.herName ?? '';

  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;';
  document.body.appendChild(container);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(1);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050308);

  const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
  camera.position.set(0, 0.15, 2.8);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xf5f0e8, 0.35));
  const key = new THREE.DirectionalLight(0xf5e8ec, 1.2);
  key.position.set(2, 3, 4);
  scene.add(key);
  const rim = new THREE.PointLight(0xc9a0a8, 0.7, 12);
  rim.position.set(-1.5, 0.5, 2);
  scene.add(rim);

  const heartRoot = new THREE.Group();
  heartRoot.rotation.x = 0.15;
  heartRoot.rotation.y = -0.35;
  scene.add(heartRoot);

  const heartMesh = new THREE.Mesh(createHeartLatheGeometry(), createHeartMaterial());
  heartMesh.scale.setScalar(0.38);
  heartRoot.add(heartMesh);

  const attachedGroups: THREE.Group[] = [];
  for (const obj of objects) {
    const group = await buildObjectMesh(obj, 'desktop');
    if (obj.position) group.position.set(obj.position.x, obj.position.y, obj.position.z);
    if (obj.rotation) group.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z);
    group.scale.setScalar((obj.scale ?? 1) * 0.85);
    heartRoot.add(group);
    attachedGroups.push(group);
  }

  renderer.render(scene, camera);

  const output = document.createElement('canvas');
  output.width = width;
  output.height = height;
  const ctx = output.getContext('2d')!;

  ctx.fillStyle = '#050308';
  ctx.fillRect(0, 0, width, height);

  const grad = ctx.createRadialGradient(width / 2, height * 0.42, 0, width / 2, height * 0.42, width * 0.45);
  grad.addColorStop(0, 'rgba(201, 160, 168, 0.18)');
  grad.addColorStop(1, 'rgba(5, 3, 8, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.drawImage(renderer.domElement, 0, 0, width, height);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5f0e8';
  ctx.font = 'italic 42px "Cormorant Garamond", Georgia, serif';
  ctx.fillText(title, width / 2, height * 0.82);

  if (herName) {
    ctx.font = '22px Outfit, sans-serif';
    ctx.fillStyle = 'rgba(245, 240, 232, 0.65)';
    ctx.fillText(`Made for ${herName}`, width / 2, height * 0.88);
  }

  heartMesh.geometry.dispose();
  (heartMesh.material as THREE.Material).dispose();
  for (const g of attachedGroups) disposeGroup(g);
  renderer.dispose();
  container.remove();

  return output;
}
