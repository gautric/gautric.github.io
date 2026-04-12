import * as THREE from 'three';
import {gridState, transitionState, RULES, ToggleCellCommand, RandomiseCommand, ClearCommand} from './engine.js';
import {camera, controls, renderer, floorMesh, makeCheckerTex, setPixelSize, dirLight, spot} from './scene.js';
import {MINIMAP_SIZE, MINIMAP_BG, MINIMAP_ALIVE, MINIMAP_DEAD, MINIMAP_FRAME_INTERVAL,
  COMPASS_SIZE, COMPASS_NEEDLE_COLOR, COMPASS_BACK_COLOR, COMPASS_TEXT_COLOR,
  COMPASS_FONT, COMPASS_NEEDLE_LEN, COMPASS_NEEDLE_HALF,
  COMPASS_NEEDLE_TAIL, COMPASS_LABEL_R, CLICK_THRESHOLD,
  CAMERA_INITIAL, CAMERA_ZOOM, CAMERA_TOP_Y,
  SPEED_SLIDER, PIXEL_SLIDER, GRID_SLIDER} from './config.js';

export function initUI(engine, eventBus, langMgr) {
  // ============ COMPASS ============
  const cctx = document.getElementById('compass-canvas').getContext('2d');
  function updateCompass(){
    const w=COMPASS_SIZE,h=COMPASS_SIZE,cx=w/2,cy=h/2;
    cctx.clearRect(0,0,w,h);
    const az=Math.atan2(camera.position.x,camera.position.z);
    const dirs=[{k:'n',a:0},{k:'e',a:Math.PI/2},{k:'s',a:Math.PI},{k:'w',a:-Math.PI/2}];
    cctx.save();cctx.translate(cx,cy);cctx.rotate(az);
    cctx.beginPath();cctx.moveTo(0,-COMPASS_NEEDLE_LEN);cctx.lineTo(COMPASS_NEEDLE_HALF,COMPASS_NEEDLE_TAIL);cctx.lineTo(-COMPASS_NEEDLE_HALF,COMPASS_NEEDLE_TAIL);cctx.closePath();
    cctx.fillStyle=COMPASS_NEEDLE_COLOR;cctx.fill();
    cctx.beginPath();cctx.moveTo(0,COMPASS_NEEDLE_LEN);cctx.lineTo(COMPASS_NEEDLE_HALF,-COMPASS_NEEDLE_TAIL);cctx.lineTo(-COMPASS_NEEDLE_HALF,-COMPASS_NEEDLE_TAIL);cctx.closePath();
    cctx.fillStyle=COMPASS_BACK_COLOR;cctx.fill();
    cctx.fillStyle=COMPASS_TEXT_COLOR;cctx.textAlign='center';cctx.textBaseline='middle';
    cctx.font=COMPASS_FONT;
    dirs.forEach(d=>{const r=COMPASS_LABEL_R;cctx.fillText(langMgr.t('compass.'+d.k),Math.sin(d.a)*r,-Math.cos(d.a)*r)});
    cctx.restore();
  }

  // ============ MINIMAP ============
  const mctx = document.getElementById('minimap').getContext('2d');
  let minimapFrame = 0;
  function renderMinimap(){
    const w=MINIMAP_SIZE,h=MINIMAP_SIZE,cs=w/gridState.size;
    mctx.fillStyle=MINIMAP_BG;mctx.fillRect(0,0,w,h);
    for(let z=0;z<gridState.size;z++)for(let x=0;x<gridState.size;x++){
      mctx.fillStyle=engine.grid[z]?.[x]?.alive?MINIMAP_ALIVE:MINIMAP_DEAD;
      mctx.fillRect(x*cs,z*cs,cs-0.3,cs-0.3);
    }
    const target=controls.target;
    const fx=(target.x+gridState.half)/gridState.size*w;
    const fz=(target.z+gridState.half)/gridState.size*h;
    const fSize=w/(camera.zoom*2);
    mctx.strokeStyle=COMPASS_NEEDLE_COLOR;mctx.lineWidth=1.5;
    mctx.save();mctx.translate(fx,fz);
    mctx.rotate(Math.atan2(camera.position.x-target.x,camera.position.z-target.z));
    mctx.strokeRect(-fSize,-fSize,fSize*2,fSize*2);
    mctx.restore();
  }

  // ============ SLIDER INIT ============
  function initSlider(id, cfg, valId) {
    const el = document.getElementById(id);
    el.min = cfg.min; el.max = cfg.max; el.value = cfg.value; el.step = cfg.step;
    document.getElementById(valId).textContent = cfg.value;
  }
  initSlider('speed-slider', SPEED_SLIDER, 'val-speed');
  initSlider('pixel-slider', PIXEL_SLIDER, 'val-pixelSize');
  initSlider('grid-slider', GRID_SLIDER, 'val-gridSize');

  // ============ HUD BINDINGS ============
  eventBus.on('stats',s=>{
    document.getElementById('val-generation').textContent=s.gen;
    document.getElementById('val-population').textContent=s.pop+' / '+s.total;
  });
  document.getElementById('speed-slider').addEventListener('input',e=>{const v=parseInt(e.target.value);document.getElementById('val-speed').textContent=v;engine.tickInterval=v/1000});
  document.getElementById('speed-slider').addEventListener('change',e=>e.target.blur());
  document.getElementById('pixel-slider').addEventListener('input',e=>{const v=parseInt(e.target.value);document.getElementById('val-pixelSize').textContent=v;setPixelSize(v)});
  document.getElementById('pixel-slider').addEventListener('change',e=>e.target.blur());
  document.getElementById('rule-select').addEventListener('change',e=>{engine.rule=RULES[e.target.value];e.target.blur()});
  document.getElementById('grid-slider').addEventListener('input',e=>{
    const v=parseInt(e.target.value);document.getElementById('val-gridSize').textContent=v;
    engine.rebuild(v,floorMesh,makeCheckerTex);engine.execute(new RandomiseCommand(engine));
  });
  document.getElementById('grid-slider').addEventListener('change',e=>e.target.blur());

  // Language change
  eventBus.on('languageChange',()=>{
    document.getElementById('hud-title').textContent=langMgr.t('title');
    document.title=langMgr.t('title');
    document.getElementById('lbl-generation').textContent=langMgr.t('generation');
    document.getElementById('lbl-population').textContent=langMgr.t('population');
    document.getElementById('lbl-speed').textContent=langMgr.t('speed');
    document.getElementById('lbl-rule').textContent=langMgr.t('rule');
    document.getElementById('lbl-pixelSize').textContent=langMgr.t('pixelSize');
    document.getElementById('lbl-gridSize').textContent=langMgr.t('gridSize');
    document.getElementById('lbl-lang').textContent=langMgr.t('langLabel');
    document.getElementById('lang-badge').textContent=langMgr.t('lang');
    document.getElementById('keys-title').textContent=langMgr.t('keysTitle');
    document.getElementById('km-playpause').textContent=langMgr.t('keys.playpause');
    document.getElementById('km-step').textContent=langMgr.t('keys.step');
    document.getElementById('km-random').textContent=langMgr.t('keys.random');
    document.getElementById('km-clear').textContent=langMgr.t('keys.clear');
    document.getElementById('km-light').textContent=langMgr.t('keys.light');
    document.getElementById('km-reset').textContent=langMgr.t('keys.reset');
    document.getElementById('km-top').textContent=langMgr.t('keys.top');
    document.getElementById('km-lang').textContent=langMgr.t('keys.lang');
    document.getElementById('km-rules').textContent=langMgr.t('keys.rules');
    document.getElementById('km-undo').textContent=langMgr.t('keys.undo');
    const sel=document.getElementById('rule-select');
    sel.options[0].text=langMgr.t('rules.conway');
    sel.options[1].text=langMgr.t('rules.highlife');
    sel.options[2].text=langMgr.t('rules.daynight');
    document.getElementById('minimap-label').textContent=langMgr.t('minimap');
    document.getElementById('lbl-transition').textContent=langMgr.t('transition');
    document.getElementById('transition-badge').textContent=langMgr.t(transitionState.enabled?'transitionOn':'transitionOff');
    updateCompass();renderMinimap();
  });

  // Camera change
  controls.addEventListener('change',()=>eventBus.emit('cameraChange',camera));

  // ============ RAYCASTING ============
  const raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2();
  let pointerDown=new THREE.Vector2();
  renderer.domElement.addEventListener('pointerdown',e=>pointerDown.set(e.clientX,e.clientY));
  renderer.domElement.addEventListener('pointerup',e=>{
    if(Math.abs(e.clientX-pointerDown.x)>CLICK_THRESHOLD||Math.abs(e.clientY-pointerDown.y)>CLICK_THRESHOLD)return;
    mouse.x=(e.clientX/window.innerWidth)*2-1;
    mouse.y=-(e.clientY/window.innerHeight)*2+1;
    raycaster.setFromCamera(mouse,camera);
    const hits=raycaster.intersectObject(floorMesh);
    if(hits.length>0){
      const p=hits[0].point,gx=Math.floor(p.x+gridState.half),gz=Math.floor(p.z+gridState.half);
      if(gx>=0&&gx<gridState.size&&gz>=0&&gz<gridState.size)engine.execute(new ToggleCellCommand(engine,gx,gz));
    }
  });

  // ============ KEYBOARD ============
  window.addEventListener('keydown',e=>{
    if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT')return;
    switch(e.key.toLowerCase()){
      case' ':e.preventDefault();engine.playing=!engine.playing;break;
      case'n':engine.step();break;
      case'r':engine.execute(new RandomiseCommand(engine));engine.generation=0;break;
      case'c':engine.execute(new ClearCommand(engine));engine.generation=0;break;
      case'1':document.getElementById('rule-select').value='conway';engine.rule=RULES.conway;break;
      case'2':document.getElementById('rule-select').value='highlife';engine.rule=RULES.highlife;break;
      case'3':document.getElementById('rule-select').value='daynight';engine.rule=RULES.daynight;break;
      case'j':langMgr.toggle();break;
      case'l':dirLight.visible=!dirLight.visible;spot.visible=!spot.visible;renderer.shadowMap.enabled=dirLight.visible;break;
      case'p':camera.position.set(CAMERA_INITIAL.x,CAMERA_INITIAL.y,CAMERA_INITIAL.z);camera.zoom=CAMERA_ZOOM;camera.updateProjectionMatrix();controls.target.set(0,0,0);controls.update();break;
      case't':camera.position.set(0,CAMERA_TOP_Y,0);camera.zoom=CAMERA_ZOOM;camera.updateProjectionMatrix();controls.target.set(0,0,0);controls.update();break;
      case'z':if(e.ctrlKey||e.metaKey)engine.undo();break;
    }
  });
  document.getElementById('lang-badge').addEventListener('click',()=>langMgr.toggle());
  document.getElementById('transition-badge').addEventListener('click',()=>{
    transitionState.enabled=!transitionState.enabled;
    document.getElementById('transition-badge').textContent=langMgr.t(transitionState.enabled?'transitionOn':'transitionOff');
  });

  return { updateCompass, renderMinimap, get minimapFrame(){ return minimapFrame }, incMinimapFrame(){ minimapFrame++ } };
}
