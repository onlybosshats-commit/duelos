const socket = io();
const $ = id => document.getElementById(id);
let selectedMode = "1v1", roomId = null, myId = null, roomState = null;
let scene, camera, renderer, me, others = new Map(), arena;
let keys = {}, pos = { x: 0, z: 0 }, lastSend = 0, gameActive = false;
const colors = { red: 0xe83c52, blue: 0x25a9ed };

function init3D() {
  scene = new THREE.Scene(); scene.background = new THREE.Color(0x8bd5ed); scene.fog = new THREE.Fog(0x8bd5ed, 24, 65);
  camera = new THREE.PerspectiveCamera(62, innerWidth/innerHeight, .1, 100);
  camera.position.set(0, 15, 19); camera.lookAt(0,0,0);
  renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(innerWidth,innerHeight); renderer.shadowMap.enabled = true;
  document.getElementById("game").prepend(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xffffff,0x647080,2));
  const sun = new THREE.DirectionalLight(0xffffff,2.1); sun.position.set(-8,18,10); sun.castShadow=true; scene.add(sun);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(24,18),new THREE.MeshStandardMaterial({color:0x687b6b,roughness:1}));
  floor.rotation.x=-Math.PI/2; floor.receiveShadow=true; scene.add(floor);
  const grid = new THREE.GridHelper(24,24,0x314b50,0x8da39a); grid.position.y=.015; scene.add(grid);
  const wallMat = new THREE.MeshStandardMaterial({color:0x344458});
  [[0,-9,24,.7],[0,9,24,.7],[-12,0,.7,18],[12,0,.7,18]].forEach(([x,z,w,d])=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,1.4,d),wallMat);m.position.set(x,.7,z);m.castShadow=true;scene.add(m)});
  const coverMat = new THREE.MeshStandardMaterial({color:0xb9c2c8});
  [[-5,-3],[5,3],[-5,3],[5,-3],[0,0]].forEach(([x,z],i)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(i===4?2.5:2,1.4,1.2),coverMat);m.position.set(x,.7,z);m.castShadow=true;scene.add(m)});
  const center = new THREE.Mesh(new THREE.CylinderGeometry(1.6,1.6,.12,32),new THREE.MeshStandardMaterial({color:0xe8c76b}));center.position.y=.08;scene.add(center);
  const hemi = new THREE.Mesh(new THREE.TorusGeometry(10,.08,8,80),new THREE.MeshStandardMaterial({color:0xffffff,emissive:0x223344}));hemi.rotation.x=Math.PI/2;hemi.position.y=.03;scene.add(hemi);
  animate();
}
function makePlayer(color) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({color,roughness:.75});
  const body = new THREE.Mesh(new THREE.BoxGeometry(.75,1.05,.48),mat);body.position.y=.95;body.castShadow=true;group.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(.58,.58,.58),new THREE.MeshStandardMaterial({color:0xf0c8a4}));head.position.y=1.78;head.castShadow=true;group.add(head);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(.68,.16,.68),new THREE.MeshStandardMaterial({color:0x20232b}));cap.position.y=2.12;group.add(cap);
  const legsMat=new THREE.MeshStandardMaterial({color:0x202b3a});
  for(const x of [-.2,.2]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.22,.65,.25),legsMat);leg.position.set(x,.34,0);group.add(leg)}
  group.userData.body=body;return group;
}
function animate() {
  requestAnimationFrame(animate);
  const t=performance.now();
  if(gameActive && me) {
    let dx=(keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0);
    let dz=(keys.ArrowDown||keys.s?1:0)-(keys.ArrowUp||keys.w?1:0);
    const len=Math.hypot(dx,dz)||1;dx/=len;dz/=len;
    pos.x=Math.max(-10.5,Math.min(10.5,pos.x+dx*.11));
    pos.z=Math.max(-7.5,Math.min(7.5,pos.z+dz*.11));
    me.position.set(pos.x,0,pos.z);
    if(t-lastSend>55){socket.emit("move",pos);lastSend=t}
    camera.position.x += (pos.x-camera.position.x)*.025;
    camera.position.z += (pos.z+19-camera.position.z)*.025;
    camera.lookAt(pos.x,0,pos.z);
  }
  renderer.render(scene,camera);
}
function syncPlayers(state) {
  roomState=state;
  $("timer").textContent=state.seconds;
  $("players").innerHTML=state.players.map(p=>`${p.team==="red"?"🔴":"🔵"} ${escapeHtml(p.name)} · ${p.role}`).join("<br>");
  const mine=state.players.find(p=>p.id===myId);
  if(mine){$("role").textContent=mine.role.toUpperCase();$("role").style.color=mine.team==="red"?"#ff5369":"#5dcaff";if(me){pos={x:mine.x,z:mine.z};me.position.set(pos.x,0,pos.z)}}
  for(const p of state.players){
    if(p.id===myId){if(!me){me=makePlayer(colors[p.team]);scene.add(me)}continue}
    if(!others.has(p.id)){const obj=makePlayer(colors[p.team]);scene.add(obj);others.set(p.id,obj)}
    const obj=others.get(p.id);obj.position.set(p.x,0,p.z);
  }
  for(const [id,obj] of others)if(!state.players.some(p=>p.id===id)){scene.remove(obj);others.delete(id)}
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function showMenu(){gameActive=false;$("menu").classList.remove("hidden");$("hud").classList.add("hidden");$("result").classList.add("hidden");}
document.querySelectorAll(".mode").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".mode").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");selectedMode=b.dataset.mode}));
$("play").onclick=()=>{const name=$("playerName").value.trim()||"Jugador";$("status").textContent="Buscando jugadores...";$("play").disabled=true;socket.emit("joinQueue",{name,mode:selectedMode})};
$("back").onclick=()=>{location.reload()};
$("again").onclick=()=>location.reload();
window.addEventListener("keydown",e=>{keys[e.key]=true});window.addEventListener("keyup",e=>{keys[e.key]=false});
function bindButton(id,key){const el=$(id);const on=e=>{e.preventDefault();keys[key]=true},off=e=>{e.preventDefault();keys[key]=false};el.addEventListener("pointerdown",on);["pointerup","pointerleave","pointercancel"].forEach(ev=>el.addEventListener(ev,off))}
bindButton("up","ArrowUp");bindButton("down","ArrowDown");bindButton("left","ArrowLeft");bindButton("right","ArrowRight");
socket.on("connect",()=>{$("connection").textContent="● Conectado";$("connection").style.color="#63e6a5";myId=socket.id});
socket.on("disconnect",()=>{$("connection").textContent="● Desconectado";$("connection").style.color="#ff6576"});
socket.on("joined",d=>{roomId=d.roomId;$("room").textContent="Sala: "+roomId;$("menu").classList.add("hidden");$("hud").classList.remove("hidden");$("status").textContent="Sala encontrada"});
socket.on("roomState",state=>{syncPlayers(state);if(state.status==="playing"){gameActive=true;$("status").textContent="¡Partida iniciada!"}else if(state.status==="waiting"){$("role").textContent="ESPERANDO";gameActive=false}});
socket.on("playerMoved",d=>{const obj=others.get(d.id);if(obj)obj.position.set(d.x,0,d.z)});
socket.on("roundOver",d=>{gameActive=false;$("result").classList.remove("hidden");$("resultTitle").textContent=d.winner==="red"?"¡VICTORIA ROJA!":"¡VICTORIA AZUL!";$("resultText").textContent=d.reason});
window.addEventListener("resize",()=>{if(!camera)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
init3D();
