import * as THREE from 'three';
import {EventBus, LanguageManager, GameEngine, RandomiseCommand} from './engine.js';
import {scene, clock, renderer, camera, composer, pixelAlignFrustum, getPixelSize, updateLightPosition, D} from './scene.js';
import {initUI} from './ui.js';
import {MINIMAP_FRAME_INTERVAL} from './config.js';

const eventBus = new EventBus();
const langMgr = new LanguageManager(eventBus, 'ja');
const engine = new GameEngine(eventBus);
engine.init(scene);

const ui = initUI(engine, eventBus, langMgr);
eventBus.emit('languageChange', 'ja');

engine.execute(new RandomiseCommand(engine));
engine._emitStats();
ui.updateCompass();
ui.renderMinimap();

function animate(){
  const dt = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  engine.update(elapsed);
  for(const row of engine.grid) for(const c of row) c.update(dt);

  const rs = renderer.getSize(new THREE.Vector2());
  const ar = rs.x / rs.y;
  const ps = getPixelSize();
  pixelAlignFrustum(camera, ar, Math.floor(rs.x/ps), Math.floor(rs.y/ps));

  ui.incMinimapFrame();
  if(ui.minimapFrame % MINIMAP_FRAME_INTERVAL === 0) ui.renderMinimap();

  composer.render();
  ui.updateCompass();
  updateLightPosition();
}
renderer.setAnimationLoop(animate);
