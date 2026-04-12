import * as THREE from 'three';
import {i18n} from './i18n.js';
import {DEFAULT_GRID_SIZE, CELL_SIZE, CELL_ALIVE_COLOR, CELL_GLOW_COLOR, CELL_SHININESS, CELL_SPECULAR,
  CELL_BORN_COLOR, CELL_BORN_GLOW, CELL_DYING_COLOR, CELL_DYING_GLOW,
  CELL_FLOAT_Y, CELL_TRANSITION_DURATION,
  RANDOM_DENSITY, DEFAULT_TICK_INTERVAL} from './config.js';

export {i18n};

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

// ============ GRID SIZE (mutable) ============
export const gridState = { size: DEFAULT_GRID_SIZE, get half(){ return this.size/2 } };
export const transitionState = { enabled: true };

// ============ FLYWEIGHT: InstancedMesh Pool ============
const sharedGeo = new THREE.BoxGeometry(CELL_SIZE, CELL_SIZE, CELL_SIZE);
const sharedMat = new THREE.MeshPhongMaterial({shininess:CELL_SHININESS, specular:CELL_SPECULAR});

const _colorAlive = new THREE.Color(CELL_ALIVE_COLOR);
const _colorBorn  = new THREE.Color(CELL_BORN_COLOR);
const _colorDying = new THREE.Color(CELL_DYING_COLOR);
const _colorDead  = new THREE.Color(0x000000);
const _dummy = new THREE.Object3D();

export class CellMeshPool {
  constructor(maxCount, scene){
    this.imesh = new THREE.InstancedMesh(sharedGeo, sharedMat, maxCount);
    this.imesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.imesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(maxCount*3), 3);
    this.imesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.imesh.castShadow = true;
    this.imesh.receiveShadow = true;
    this.scene = scene;
    scene.add(this.imesh);
  }
  setTransform(idx, x, y, z, s){
    _dummy.position.set(x, y, z);
    _dummy.scale.set(s, s, s);
    _dummy.updateMatrix();
    this.imesh.setMatrixAt(idx, _dummy.matrix);
  }
  setColor(idx, color){
    this.imesh.setColorAt(idx, color);
  }
  needsUpdate(){
    this.imesh.instanceMatrix.needsUpdate = true;
    if(this.imesh.instanceColor) this.imesh.instanceColor.needsUpdate = true;
  }
  dispose(){
    this.scene.remove(this.imesh);
    this.imesh.dispose();
  }
  rebuild(maxCount){
    this.scene.remove(this.imesh);
    this.imesh.dispose();
    this.imesh = new THREE.InstancedMesh(sharedGeo, sharedMat, maxCount);
    this.imesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.imesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(maxCount*3), 3);
    this.imesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.imesh.castShadow = true;
    this.imesh.receiveShadow = true;
    this.scene.add(this.imesh);
  }
}

// ============ CELL STATES ============
class CellState { enter(cell){} update(cell,dt){} }
export class AliveState extends CellState {
  enter(cell){
    cell.pool.setTransform(cell.idx, cell.wx, CELL_FLOAT_Y, cell.wz, 1);
    cell.pool.setColor(cell.idx, _colorAlive);
  }
  update(){}
}
export class DeadState extends CellState {
  enter(cell){
    cell.pool.setTransform(cell.idx, cell.wx, 0, cell.wz, 0);
    cell.pool.setColor(cell.idx, _colorDead);
  }
  update(){}
}
export class BorningState extends CellState {
  enter(cell){
    if(!transitionState.enabled){cell.setState(new AliveState());return}
    cell._tw=0;
    cell.pool.setColor(cell.idx, _colorBorn);
  }
  update(cell,dt){
    cell._tw=Math.min(cell._tw+dt/CELL_TRANSITION_DURATION,1);
    const s=cell._tw;
    cell.pool.setTransform(cell.idx, cell.wx, CELL_FLOAT_Y*s, cell.wz, s);
    if(cell._tw>=1) cell.setState(new AliveState());
  }
}
export class DyingState extends CellState {
  enter(cell){
    if(!transitionState.enabled){cell.setState(new DeadState());return}
    cell._tw=1;
    cell.pool.setColor(cell.idx, _colorDying);
  }
  update(cell,dt){
    cell._tw=Math.max(cell._tw-dt/CELL_TRANSITION_DURATION,0);
    const s=cell._tw;
    cell.pool.setTransform(cell.idx, cell.wx, CELL_FLOAT_Y*s, cell.wz, s);
    if(cell._tw<=0) cell.setState(new DeadState());
  }
}

// ============ CELL ============
export class Cell {
  constructor(pool, idx, gx, gz){
    this.pool=pool; this.idx=idx; this.gx=gx; this.gz=gz;
    this.wx = gx - gridState.half + 0.5;
    this.wz = gz - gridState.half + 0.5;
    this.alive=false; this.nextAlive=false; this.state=null; this._tw=0;
    this.setState(new DeadState());
  }
  setState(s){this.state=s;s.enter(this)}
  update(dt){this.state.update(this,dt)}
}

// ============ COMMANDS ============
export class ToggleCellCommand {
  constructor(engine,gx,gz){this.engine=engine;this.gx=gx;this.gz=gz;this.prev=null}
  execute(){const c=this.engine.grid[this.gz]?.[this.gx];if(!c)return;this.prev=c.alive;c.alive=!c.alive;c.setState(c.alive?new BorningState():new DyingState())}
  undo(){const c=this.engine.grid[this.gz]?.[this.gx];if(!c)return;c.alive=this.prev;c.setState(c.alive?new BorningState():new DyingState())}
}
export class RandomiseCommand {
  constructor(engine){this.engine=engine;this.prev=null}
  execute(){this.prev=this.engine.grid.map(r=>r.map(c=>c.alive));for(const row of this.engine.grid)for(const c of row){c.alive=Math.random()<RANDOM_DENSITY;c.setState(c.alive?new BorningState():new DyingState())}}
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
    this.eventBus=eventBus;this.grid=[];this.pool=null;this.rule=RULES.conway;this.playing=false;
    this.tickInterval=DEFAULT_TICK_INTERVAL;this.lastTick=0;this.generation=0;this.cmdHistory=[];
  }
  init(scene){
    this.scene=scene;
    const count=gridState.size*gridState.size;
    this.pool=new CellMeshPool(count, scene);
    this.grid=[];
    let idx=0;
    for(let z=0;z<gridState.size;z++){const row=[];for(let x=0;x<gridState.size;x++)row.push(new Cell(this.pool,idx++,x,z));this.grid.push(row)}
    this.pool.needsUpdate();
  }
  rebuild(newSize,floorMesh,makeCheckerTex){
    this.pool.dispose();
    gridState.size=newSize;
    const count=gridState.size*gridState.size;
    this.pool=new CellMeshPool(count, this.scene);
    this.grid=[];
    let idx=0;
    for(let z=0;z<gridState.size;z++){const row=[];for(let x=0;x<gridState.size;x++)row.push(new Cell(this.pool,idx++,x,z));this.grid.push(row)}
    this.pool.needsUpdate();
    floorMesh.geometry.dispose();floorMesh.material.map.dispose();floorMesh.material.dispose();
    floorMesh.geometry=new THREE.PlaneGeometry(gridState.size,gridState.size);
    floorMesh.material=new THREE.MeshPhongMaterial({map:makeCheckerTex(4,gridState.size/2)});
    this.generation=0;this.cmdHistory=[];this._emitStats();
  }
  execute(cmd){cmd.execute();this.pool.needsUpdate();this._emitStats()}
  undo(){const cmd=this.cmdHistory.pop();if(cmd){cmd.undo();this.pool.needsUpdate()}this._emitStats()}
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
    this.pool.needsUpdate();
    this.generation++;this._emitStats();
  }
  update(elapsed){if(!this.playing)return;if(elapsed-this.lastTick>=this.tickInterval){this.lastTick=elapsed;this.step()}}
  getPopulation(){let n=0;for(const r of this.grid)for(const c of r)if(c.alive)n++;return n}
  _emitStats(){this.eventBus.emit('stats',{gen:this.generation,pop:this.getPopulation(),total:gridState.size*gridState.size})}
}
