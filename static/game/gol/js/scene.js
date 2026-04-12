import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPixelatedPass} from 'three/addons/postprocessing/RenderPixelatedPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {gridState} from './engine.js';
import {BG_COLOR, CAMERA_D, CAMERA_INITIAL, CAMERA_ZOOM, ORBIT_MAX_ZOOM, ORBIT_MIN_ZOOM,
  AMBIENT_COLOR, AMBIENT_INTENSITY, DIR_LIGHT_COLOR, DIR_LIGHT_INTENSITY,
  DIR_LIGHT_SHADOW_SIZE, DIR_LIGHT_SHADOW_EXTENT, DIR_LIGHT_OFFSET, DIR_LIGHT_Y,
  SPOT_COLOR, SPOT_INTENSITY, SPOT_DISTANCE, SPOT_ANGLE, SPOT_PENUMBRA, SPOT_DECAY, SPOT_POSITION,
  DEFAULT_PIXEL_SIZE, NORMAL_EDGE_STRENGTH, DEPTH_EDGE_STRENGTH,
  CHECKER_SIZE, CHECKER_DARK, CHECKER_LIGHT} from './config.js';

export const D = CAMERA_D;
export const scene = new THREE.Scene();
scene.background = new THREE.Color(BG_COLOR);
export const clock = new THREE.Clock();

// Renderer
export const renderer = new THREE.WebGLRenderer();
renderer.shadowMap.enabled = true;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Isometric Orthographic Camera
export let aspect = window.innerWidth / window.innerHeight;
export const camera = new THREE.OrthographicCamera(-D*aspect, D*aspect, D, -D, 0.1, 1000);
camera.position.set(CAMERA_INITIAL.x, CAMERA_INITIAL.y, CAMERA_INITIAL.z);
camera.lookAt(0, 0, 0);
camera.zoom = CAMERA_ZOOM;
camera.updateProjectionMatrix();

// OrbitControls
export const controls = new OrbitControls(camera, renderer.domElement);
controls.enableRotate=true;controls.enablePan=true;controls.enableZoom=true;
controls.maxZoom=ORBIT_MAX_ZOOM;controls.minZoom=ORBIT_MIN_ZOOM;
controls.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN};

// Lights
scene.add(new THREE.AmbientLight(AMBIENT_COLOR, AMBIENT_INTENSITY));
export const dirLight = new THREE.DirectionalLight(DIR_LIGHT_COLOR, DIR_LIGHT_INTENSITY);
dirLight.castShadow=true;
dirLight.shadow.mapSize.set(DIR_LIGHT_SHADOW_SIZE,DIR_LIGHT_SHADOW_SIZE);
dirLight.shadow.camera.left=-DIR_LIGHT_SHADOW_EXTENT;dirLight.shadow.camera.right=DIR_LIGHT_SHADOW_EXTENT;
dirLight.shadow.camera.top=DIR_LIGHT_SHADOW_EXTENT;dirLight.shadow.camera.bottom=-DIR_LIGHT_SHADOW_EXTENT;
scene.add(dirLight);
export const spot = new THREE.SpotLight(SPOT_COLOR, SPOT_INTENSITY, SPOT_DISTANCE, SPOT_ANGLE, SPOT_PENUMBRA, SPOT_DECAY);
spot.position.set(SPOT_POSITION.x, SPOT_POSITION.y, SPOT_POSITION.z);spot.castShadow=true;scene.add(spot);

// Keep directional light to the left of the camera
export function updateLightPosition(){
  const left = new THREE.Vector3(-1,0,0).applyQuaternion(camera.quaternion);
  dirLight.position.copy(camera.position).addScaledVector(left, DIR_LIGHT_OFFSET).y = DIR_LIGHT_Y;
  dirLight.target.position.set(0,0,0);
}

// Post-Processing
export const composer = new EffectComposer(renderer);
export const renderPixelatedPass = new RenderPixelatedPass(DEFAULT_PIXEL_SIZE, scene, camera);
renderPixelatedPass.normalEdgeStrength = NORMAL_EDGE_STRENGTH;
renderPixelatedPass.depthEdgeStrength = DEPTH_EDGE_STRENGTH;
composer.addPass(renderPixelatedPass);
composer.addPass(new OutputPass());

export let pixelSize = DEFAULT_PIXEL_SIZE;
export function getPixelSize(){ return pixelSize; }
export function setPixelSize(v){ pixelSize = v; renderPixelatedPass.setPixelSize(v); }

// Checker texture (procedural)
export function makeCheckerTex(size, reps) {
  const c = document.createElement('canvas');c.width=size;c.height=size;
  const ctx=c.getContext('2d');const s=size/2;
  ctx.fillStyle=CHECKER_DARK;ctx.fillRect(0,0,size,size);
  ctx.fillStyle=CHECKER_LIGHT;ctx.fillRect(0,0,s,s);ctx.fillRect(s,s,s,s);
  const t=new THREE.CanvasTexture(c);
  t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(reps,reps);
  t.minFilter=t.magFilter=THREE.NearestFilter;t.generateMipmaps=false;
  t.colorSpace=THREE.SRGBColorSpace;return t;
}

// Floor
export const floorMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(gridState.size, gridState.size),
  new THREE.MeshPhongMaterial({map:makeCheckerTex(4, gridState.size/2)})
);
floorMesh.rotation.x=-Math.PI/2;floorMesh.receiveShadow=true;scene.add(floorMesh);

// Pixel-align helper
export function pixelAlignFrustum(cam, ar, pxW, pxH) {
  const wsW=(cam.right-cam.left)/cam.zoom, wsH=(cam.top-cam.bottom)/cam.zoom;
  const pw=wsW/pxW, ph=wsH/pxH;
  const cp=new THREE.Vector3();cam.getWorldPosition(cp);
  const cq=new THREE.Quaternion();cam.getWorldQuaternion(cq);
  const cr=new THREE.Vector3(1,0,0).applyQuaternion(cq);
  const cu=new THREE.Vector3(0,1,0).applyQuaternion(cq);
  const prx=cp.dot(cr)/pw, pry=cp.dot(cu)/ph;
  const fx=prx-Math.round(prx), fy=pry-Math.round(pry);
  cam.left=-ar*D-(fx*pw);cam.right=ar*D-(fx*pw);
  cam.top=D-(fy*ph);cam.bottom=-D-(fy*ph);
  cam.updateProjectionMatrix();
}

// Resize
export function onResize(){
  aspect=window.innerWidth/window.innerHeight;
  camera.left=-D*aspect;camera.right=D*aspect;camera.top=D;camera.bottom=-D;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth,window.innerHeight);
  composer.setSize(window.innerWidth,window.innerHeight);
}
window.addEventListener('resize',onResize);
