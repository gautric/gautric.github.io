import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPixelatedPass} from 'three/addons/postprocessing/RenderPixelatedPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {gridState} from './engine.js';

export const D = 20;
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x151729);
export const clock = new THREE.Clock();

// Renderer
export const renderer = new THREE.WebGLRenderer();
renderer.shadowMap.enabled = true;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Isometric Orthographic Camera
export let aspect = window.innerWidth / window.innerHeight;
export const camera = new THREE.OrthographicCamera(-D*aspect, D*aspect, D, -D, 0.1, 1000);
camera.position.set(30, 30, 30);
camera.lookAt(0, 0, 0);
camera.zoom = 1.2;
camera.updateProjectionMatrix();

// OrbitControls
export const controls = new OrbitControls(camera, renderer.domElement);
controls.enableRotate=true;controls.enablePan=true;controls.enableZoom=true;
controls.maxZoom=4;controls.minZoom=0.5;
controls.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN};

// Lights
scene.add(new THREE.AmbientLight(0x757f8e, 5));
export const dirLight = new THREE.DirectionalLight(0xfffecd, 3);
dirLight.castShadow=true;
dirLight.shadow.mapSize.set(2048,2048);
dirLight.shadow.camera.left=-30;dirLight.shadow.camera.right=30;
dirLight.shadow.camera.top=30;dirLight.shadow.camera.bottom=-30;
scene.add(dirLight);
export const spot = new THREE.SpotLight(0xffc100, 20, 40, Math.PI/16, 0.02, 2);
spot.position.set(-10, 15, 0);spot.castShadow=true;scene.add(spot);

// Keep directional light to the left of the camera
export function updateLightPosition(){
  const left = new THREE.Vector3(-1,0,0).applyQuaternion(camera.quaternion);
  dirLight.position.copy(camera.position).addScaledVector(left, 60).y = 80;
  dirLight.target.position.set(0,0,0);
}

// Post-Processing
export const composer = new EffectComposer(renderer);
export const renderPixelatedPass = new RenderPixelatedPass(1, scene, camera);
renderPixelatedPass.normalEdgeStrength = 0.3;
renderPixelatedPass.depthEdgeStrength = 0.4;
composer.addPass(renderPixelatedPass);
composer.addPass(new OutputPass());

export let pixelSize = 1;
export function getPixelSize(){ return pixelSize; }
export function setPixelSize(v){ pixelSize = v; renderPixelatedPass.setPixelSize(v); }

// Checker texture (procedural)
export function makeCheckerTex(size, reps) {
  const c = document.createElement('canvas');c.width=size;c.height=size;
  const ctx=c.getContext('2d');const s=size/2;
  ctx.fillStyle='#2a2f4a';ctx.fillRect(0,0,size,size);
  ctx.fillStyle='#1a1f3a';ctx.fillRect(0,0,s,s);ctx.fillRect(s,s,s,s);
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
