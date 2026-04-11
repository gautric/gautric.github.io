import * as THREE from 'three';
import {gridState, RULES, ToggleCellCommand, RandomiseCommand, ClearCommand} from './engine.js';
import {camera, controls, renderer, floorMesh, makeCheckerTex, setPixelSize, dirLight, spot} from './scene.js';

export function initUI(engine, eventBus, langMgr) {
  // ============ COMPASS ============
  const cctx = document.getElementById('compass-canvas').getContext('2d');
  function updateCompass(){
    const w=80,h=80,cx=w/2,cy=h/2;
    cctx.clearRect(0,0,w,h);
    const az=Math.atan2(camera.position.x,camera.position.z);
    const dirs=[{k:'n',a:0},{k:'e',a:Math.PI/2},{k:'s',a:Math.PI},{k:'w',a:-Math.PI/2}];
    cctx.save();cctx.translate(cx,cy);cctx.rotate(az);
    cctx.beginPath();cctx.moveTo(0,-28);cctx.lineTo(6,8);cctx.lineTo(-6,8);cctx.closePath();
    cctx.fillStyle='#ffc100';cctx.fill();
    cctx.beginPath();cctx.moveTo(0,28);cctx.lineTo(6,-8);cctx.lineTo(-6,-8);cctx.closePath();
    cctx.fillStyle='rgba(200,208,224,0.3)';cctx.fill();
    cctx.fillStyle='#c8d0e0';cctx.textAlign='center';cctx.textBaseline='middle';
    cctx.font=document.body.classList.contains('lang-ja')?'10px DotGothic16':'7px Press Start 2P';
    dirs.forEach(d=>{const r=34;cctx.fillText(langMgr.t('compass.'+d.k),Math.sin(d.a)*r,-Math.cos(d.a)*r)});
    cctx.restore();
  }

  // ============ MINIMAP ============
  const mctx = document.getElementById('minimap').getContext('2d');
  let minimapFrame = 0;
  function renderMinimap(){
    const w=140,h=140,cs=w/gridState.size;
    mctx.fillStyle='#0d0f1a';mctx.fillRect(0,0,w,h);
    for(let z=0;z<gridState.size;z++)for(let x=0;x<gridState.size;x++){
      mctx.fillStyle=engine.grid[z]?.[x]?.alive?'#68b7e9':'#1a1f3a';
      mctx.fillRect(x*cs,z*cs,cs-0.3,cs-0.3);
    }
    const target=controls.target;
    const fx=(target.x+gridState.half)/gridState.size*w;
    const fz=(target.z+gridState.half)/gridState.size*h;
    const fSize=w/(camera.zoom*2);
    mctx.strokeStyle='#ffc100';mctx.lineWidth=1.5;
    mctx.save();mctx.translate(fx,fz);
    mctx.rotate(Math.atan2(camera.position.x-target.x,camera.position.z-target.z));
    mctx.strokeRect(-fSize,-fSize,fSize*2,fSize*2);
    mctx.restore();
  }

  // ============ HUD BINDINGS ============
  eventBus.on('stats',s=>{
    document.getElementById('val-generation').textContent=s.gen;
    document.getElementById('val-population').textContent=s.pop+' / '+s.total;
  });
  document.getElementById('speed-slider').addEventListener('input',e=>{const v=parseInt(e.target.value);document.getElementById('val-speed').textContent=v;engine.tickInterval=v/1000});
  document.getElementById('pixel-slider').addEventListener('input',e=>{const v=parseInt(e.target.value);document.getElementById('val-pixelSize').textContent=v;setPixelSize(v)});
  document.getElementById('rule-select').addEventListener('change',e=>{engine.rule=RULES[e.target.value]});
  document.getElementById('grid-slider').addEventListener('input',e=>{
    const v=parseInt(e.target.value);document.getElementById('val-gridSize').textContent=v;
    engine.rebuild(v,floorMesh,makeCheckerTex);engine.execute(new RandomiseCommand(engine));
  });

  // Language change
  eventBus.on('languageChange',()=>{
    document.getElementById('hud-title').textContent=langMgr.t('title');
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
    updateCompass();renderMinimap();
  });

  // Camera change
  controls.addEventListener('change',()=>eventBus.emit('cameraChange',camera));

  // ============ RAYCASTING ============
  const raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2();
  let pointerDown=new THREE.Vector2();
  renderer.domElement.addEventListener('pointerdown',e=>pointerDown.set(e.clientX,e.clientY));
  renderer.domElement.addEventListener('pointerup',e=>{
    if(Math.abs(e.clientX-pointerDown.x)>4||Math.abs(e.clientY-pointerDown.y)>4)return;
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
      case'p':camera.position.set(30,30,30);camera.zoom=1.2;camera.updateProjectionMatrix();controls.target.set(0,0,0);controls.update();break;
      case't':camera.position.set(0,60,0);camera.zoom=1.2;camera.updateProjectionMatrix();controls.target.set(0,0,0);controls.update();break;
      case'z':if(e.ctrlKey||e.metaKey)engine.undo();break;
    }
  });
  document.getElementById('lang-badge').addEventListener('click',()=>langMgr.toggle());

  return { updateCompass, renderMinimap, get minimapFrame(){ return minimapFrame }, incMinimapFrame(){ minimapFrame++ } };
}
