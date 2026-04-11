import * as THREE from 'three';

// ============ I18N DATA ============
export const i18n = {
  en:{title:"Game of Life 3D",generation:"Generation",population:"Population",speed:"Speed",rule:"Rule",pixelSize:"Pixel Size",
    play:"Play",pause:"Pause",step:"Step",randomise:"Random",clear:"Clear",gridSize:"Grid Size",
    rules:{conway:"Conway",highlife:"HighLife",daynight:"Day & Night"},
    compass:{n:"N",s:"S",e:"E",w:"W"},minimap:"Minimap",lang:"EN",
    keysTitle:"Keys",langLabel:"Language",
    keys:{playpause:"Play / Pause",step:"Step",random:"Random",clear:"Clear",light:"Toggle Light",reset:"Reset Camera",top:"Top View",lang:"Language",rules:"Switch Rule",undo:"Undo"},
    shortcuts:"Space: Play/Pause · N: Step · R: Random · C: Clear · J: 言語"},
  ja:{title:"ライフゲーム 3D",generation:"世代",population:"個体数",speed:"速度",rule:"ルール",pixelSize:"ピクセル",
    play:"再生",pause:"一時停止",step:"一手",randomise:"ランダム",clear:"クリア",gridSize:"グリッド",
    rules:{conway:"コンウェイ",highlife:"ハイライフ",daynight:"デイ＆ナイト"},
    compass:{n:"北",s:"南",e:"東",w:"西"},minimap:"全体図",lang:"JP",
    keysTitle:"キー",langLabel:"言語",
    keys:{playpause:"再生 / 一時停止",step:"一手",random:"ランダム",clear:"クリア",light:"ライト切替",reset:"カメラリセット",top:"上から表示",lang:"言語",rules:"ルール切替",undo:"元に戻す"},
    shortcuts:"Space: 再生 · N: 一手 · R: ランダム · C: クリア · J: Lang"}
};

// ============ OBSERVER / EVENT BUS ============
export class EventBus {
  constructor(){this._m={}}
  on(e,fn){(this._m[e]||(this._m[e]=[])).push(fn)}
  off(e,fn){if(this._m[e])this._m[e]=this._m[e].filter(f=>f!==fn)}
  emit(e,...a){(this._m[e]||[]).forEach(fn=>fn(...a))}
}

// ============ LANGUAGE MANAGER ============
export class LanguageManager {
  constructor(bus,lang='en'){this.bus=bus;this.currentLang=lang}
  toggle(){this.currentLang=this.currentLang==='en'?'ja':'en';document.body.className='lang-'+this.currentLang;this.bus.emit('languageChange',this.currentLang)}
  t(key){return key.split('.').reduce((o,k)=>o?.[k],i18n[this.currentLang])??key}
}

// ============ RULE STRATEGIES ============
class ClassicConwayRule { apply(alive,n){return alive?(n===2||n===3):(n===3)} }
class HighLifeRule { apply(alive,n){return alive?(n===2||n===3):(n===3||n===6)} }
class DayAndNightRule { apply(alive,n){return alive?[3,4,6,7,8].includes(n):[3,6,7,8].includes(n)} }
export const RULES={conway:new ClassicConwayRule(),highlife:new HighLifeRule(),daynight:new DayAndNightRule()};

// ============ CELL STATES ============
class CellState { enter(cell){} update(cell,dt){} }
export class AliveState extends CellState {
  enter(cell){cell.mesh.visible=true;cell.mesh.scale.set(1,1,1);cell.mesh.material.color.setHex(0x68b7e9);cell.mesh.material.emissive.setHex(0x4f7e8b)}
  update(cell,dt){cell.mesh.position.y=0.4+Math.sin(performance.now()*0.003)*0.03}
}
export class DeadState extends CellState {
  enter(cell){cell.mesh.visible=false;cell.mesh.scale.set(0,0,0)}
  update(){}
}
export class BorningState extends CellState {
  enter(cell){cell.mesh.visible=true;cell._tw=0;cell.mesh.material.color.setHex(0x44cc66);cell.mesh.material.emissive.setHex(0x227733)}
  update(cell,dt){cell._tw=Math.min(cell._tw+dt/0.2,1);const s=cell._tw;cell.mesh.scale.set(s,s,s);cell.mesh.position.y=0.4*s;if(cell._tw>=1)cell.setState(new AliveState())}
}
export class DyingState extends CellState {
  enter(cell){cell._tw=1;cell.mesh.material.color.setHex(0xdd4444);cell.mesh.material.emissive.setHex(0x882222)}
  update(cell,dt){cell._tw=Math.max(cell._tw-dt/0.2,0);const s=cell._tw;cell.mesh.scale.set(s,s,s);cell.mesh.position.y=0.4*s;if(cell._tw<=0)cell.setState(new DeadState())}
}

// ============ GRID SIZE (mutable) ============
export const gridState = { size: 40, get half(){ return this.size/2 } };

// ============ FLYWEIGHT ============
const sharedGeo = new THREE.BoxGeometry(0.8,0.8,0.8);
const sharedMat = new THREE.MeshPhongMaterial({color:0x68b7e9,emissive:0x4f7e8b,shininess:10,specular:0xffffff});

// ============ CELL ============
export class Cell {
  constructor(mesh,gx,gz){this.mesh=mesh;this.gx=gx;this.gz=gz;this.alive=false;this.nextAlive=false;this.state=null;this._tw=0;this.setState(new DeadState())}
  setState(s){this.state=s;s.enter(this)}
  update(dt){this.state.update(this,dt)}
}

// ============ CELL FACTORY ============
export class CellFactory {
  static create(x,z,scene){
    const mesh=new THREE.Mesh(sharedGeo,sharedMat.clone());
    mesh.castShadow=true;mesh.receiveShadow=true;
    mesh.position.set(x-gridState.half+0.5,0,z-gridState.half+0.5);
    mesh.visible=false;scene.add(mesh);
    return new Cell(mesh,x,z);
  }
}

// ============ COMMANDS ============
export class ToggleCellCommand {
  constructor(engine,gx,gz){this.engine=engine;this.gx=gx;this.gz=gz;this.prev=null}
  execute(){const c=this.engine.grid[this.gz]?.[this.gx];if(!c)return;this.prev=c.alive;c.alive=!c.alive;c.setState(c.alive?new BorningState():new DyingState())}
  undo(){const c=this.engine.grid[this.gz]?.[this.gx];if(!c)return;c.alive=this.prev;c.setState(c.alive?new BorningState():new DyingState())}
}
export class RandomiseCommand {
  constructor(engine){this.engine=engine;this.prev=null}
  execute(){this.prev=this.engine.grid.map(r=>r.map(c=>c.alive));for(const row of this.engine.grid)for(const c of row){c.alive=Math.random()<0.3;c.setState(c.alive?new BorningState():new DyingState())}}
  undo(){this.engine.grid.forEach((row,z)=>row.forEach((c,x)=>{c.alive=this.prev[z][x];c.setState(c.alive?new BorningState():new DyingState())}))}
}
export class ClearCommand {
  constructor(engine){this.engine=engine;this.prev=null}
  execute(){this.prev=this.engine.grid.map(r=>r.map(c=>c.alive));for(const row of this.engine.grid)for(const c of row){c.alive=false;c.setState(new DyingState())}}
  undo(){this.engine.grid.forEach((row,z)=>row.forEach((c,x)=>{c.alive=this.prev[z][x];c.setState(c.alive?new BorningState():new DyingState())}))}
}

// ============ GAME ENGINE (Singleton) ============
export class GameEngine {
  constructor(eventBus){
    if(GameEngine._inst)return GameEngine._inst;GameEngine._inst=this;
    this.eventBus=eventBus;this.grid=[];this.rule=RULES.conway;this.playing=false;
    this.tickInterval=0.2;this.lastTick=0;this.generation=0;this.cmdHistory=[];
  }
  init(scene){
    this.scene=scene;this.grid=[];
    for(let z=0;z<gridState.size;z++){const row=[];for(let x=0;x<gridState.size;x++)row.push(CellFactory.create(x,z,scene));this.grid.push(row)}
  }
  rebuild(newSize,floorMesh,makeCheckerTex){
    for(const row of this.grid)for(const c of row)this.scene.remove(c.mesh);
    gridState.size=newSize;
    this.grid=[];
    for(let z=0;z<gridState.size;z++){const row=[];for(let x=0;x<gridState.size;x++)row.push(CellFactory.create(x,z,this.scene));this.grid.push(row)}
    floorMesh.geometry.dispose();floorMesh.material.map.dispose();floorMesh.material.dispose();
    floorMesh.geometry=new THREE.PlaneGeometry(gridState.size,gridState.size);
    floorMesh.material=new THREE.MeshPhongMaterial({map:makeCheckerTex(4,gridState.size/2)});
    this.generation=0;this.cmdHistory=[];this._emitStats();
  }
  execute(cmd){cmd.execute();this.cmdHistory.push(cmd);this._emitStats()}
  undo(){const cmd=this.cmdHistory.pop();if(cmd)cmd.undo();this._emitStats()}
  countNeighbors(gx,gz){
    let n=0;const S=gridState.size;
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dz)continue;
      if(this.grid[(gz+dz+S)%S][(gx+dx+S)%S].alive)n++}
    return n;
  }
  step(){
    const S=gridState.size;
    for(let z=0;z<S;z++)for(let x=0;x<S;x++)
      this.grid[z][x].nextAlive=this.rule.apply(this.grid[z][x].alive,this.countNeighbors(x,z));
    for(let z=0;z<S;z++)for(let x=0;x<S;x++){
      const c=this.grid[z][x];
      if(c.nextAlive!==c.alive){c.alive=c.nextAlive;c.setState(c.alive?new BorningState():new DyingState())}
    }
    this.generation++;this._emitStats();
  }
  update(elapsed){if(!this.playing)return;if(elapsed-this.lastTick>=this.tickInterval){this.lastTick=elapsed;this.step()}}
  getPopulation(){let n=0;for(const r of this.grid)for(const c of r)if(c.alive)n++;return n}
  _emitStats(){this.eventBus.emit('stats',{gen:this.generation,pop:this.getPopulation(),total:gridState.size*gridState.size})}
}
