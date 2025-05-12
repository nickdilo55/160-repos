var VSHADER_SOURCE = `
  precision mediump float;
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  varying vec2 v_UV;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  void main() {
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
    v_UV = a_UV;
  }`;

// Fragment shader program
var FSHADER_SOURCE = `
  precision mediump float;
  varying vec2 v_UV;
  uniform vec4 u_FragColor;
  uniform sampler2D u_Sampler0;
  uniform int u_whichTexture;
  void main() {
    if (u_whichTexture == -2) {
      gl_FragColor = u_FragColor;
    } else if (u_whichTexture == -1) {
      gl_FragColor = vec4(v_UV, 1.0, 1.0);
    } else if (u_whichTexture == 0) {
      gl_FragColor = texture2D(u_Sampler0, v_UV);
    } else {
      gl_FragColor = vec4(1.0, 0.2, 0.2, 1.0);
    }
  }`;

// GL and GLSL handles
let canvas, gl;
let a_Position, a_UV;
let u_FragColor, u_Size;
let u_ModelMatrix, u_ViewMatrix, u_ProjectionMatrix, u_GlobalRotateMatrix;
let u_Sampler0, u_whichTexture;
let hedgeTexture;

// Animation angles
let g_yellowAngle = 0, g_magentaAngle = 0;
let g_yellowAnimation = false, g_magentaAnimation = false;

// Mouse drag rotation angles
let g_mouseXAngle = 0, g_mouseYAngle = 0;
let g_lastMouseX = 0, g_lastMouseY = 0;
let g_startXAngle = 0, g_startYAngle = 0;
let g_mouseDragging = false;

// Shapes drawn via click()
let g_shapesList = [];

// Pivot for orbit rotation
const PIVOT = { x: 0, y: -0.5, z: 0 };

// Map size and array (32×32) — borders=1, interior=0
const MAP_SIZE = 32;

// Simple odd-step “recursive backtracker” maze generator
function generateMaze(size) {
  // 1) Start with a grid full of walls (1)
  const map = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => 1)
  );

  // 2) Carve passages at odd indices only
  const stack = [];
  const start = [1, 1];
  map[start[1]][start[0]] = 0;
  stack.push(start);

  const dirs = [
    [ 2,  0], // right
    [-2,  0], // left
    [ 0,  2], // down
    [ 0, -2], // up
  ];

  while (stack.length) {
    const [x, y] = stack[stack.length - 1];

    // find unvisited neighbors two cells away
    const neighbors = dirs
      .map(([dx, dy]) => [x + dx, y + dy, x + dx/2, y + dy/2])
      .filter(([nx, ny]) =>
        nx > 0 && nx < size - 1 &&
        ny > 0 && ny < size - 1 &&
        map[ny][nx] === 1
      );

    if (neighbors.length) {
      // pick a random neighbor
      const [nx, ny, wx, wy] = neighbors[
        Math.floor(Math.random() * neighbors.length)
      ];
      // carve the wall and the cell
      map[wy][wx] = 0;
      map[ny][nx] = 0;
      stack.push([nx, ny]);
    } else {
      // backtrack
      stack.pop();
    }
  }

  return map;
}

// carve out a clear central plaza (no walls in a 7×7 block)
function clearCenter(map, radius = 3) {
  const center = Math.floor(map.length / 2);
  for (let y = center - radius; y <= center + radius; y++) {
    for (let x = center - radius; x <= center + radius; x++) {
      map[y][x] = 0;
    }
  }
}

// replace your old g_map with:
let g_map = generateMaze(MAP_SIZE);
clearCenter(g_map, /* radius= */3);

function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
  if (!gl) console.error('Failed to get WebGL context');
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.6, 0.8, 1.0, 1.0);
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.error('Failed to initialize shaders.');
    return;
  }
  a_Position           = gl.getAttribLocation(gl.program, 'a_Position');
  a_UV                 = gl.getAttribLocation(gl.program, 'a_UV');
  u_FragColor          = gl.getUniformLocation(gl.program, 'u_FragColor');
  u_Size               = gl.getUniformLocation(gl.program, 'u_Size');
  u_ModelMatrix        = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
  u_ViewMatrix         = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjectionMatrix   = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  u_Sampler0           = gl.getUniformLocation(gl.program, 'u_Sampler0');
  u_whichTexture       = gl.getUniformLocation(gl.program, 'u_whichTexture');

  const identityM = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);
}

function addActionsForHtmlUI() {
  document.getElementById('animationYellowOnButton').onclick  = () => g_yellowAnimation = true;
  document.getElementById('animationYellowOffButton').onclick = () => g_yellowAnimation = false;
  document.getElementById('animationMagentaOnButton').onclick = () => g_magentaAnimation = true;
  document.getElementById('animationMagentaOffButton').onclick= () => g_magentaAnimation = false;
}

function initTextures() {
  const image = new Image();
  image.onload = () => sendTextureToTEXTURE0(image);
  image.src = 'sky.png';
  return true;
}

function sendTextureToTEXTURE0(image) {
  const texture = gl.createTexture();
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
  gl.uniform1i(u_Sampler0, 0);
}

function drawMap() {
  const rows = MAP_SIZE, cols = MAP_SIZE;
  const blockSize = 1;
  const halfW = cols / 2, halfD = rows / 2;
  const floorY         = -1.2;
  const floorThickness = 0.01;
  const floorTopY      = floorY + floorThickness / 2;

  for (let z = 0; z < rows; z++) {
    for (let x = 0; x < cols; x++) {
      if (g_map[z][x] === 1) {
        const wall = new Cube();
        wall.textureNum = -2;
        wall.color      = [0.5, 0.5, 0.5, 1];
        wall.matrix.setIdentity()
          .translate(
            x - halfW + blockSize / 2,
            floorTopY + blockSize / 2,
            z - halfD + blockSize / 2
          )
          .scale(blockSize, blockSize, blockSize);
        wall.render();
      }
    }
  }
}

function renderAllShapes() {

  const rows = MAP_SIZE, cols = MAP_SIZE;
  const startTime = performance.now();

  g_camera.resize();
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, g_camera.projectionMatrix.elements);
  const orbit = new Matrix4()
    .translate(PIVOT.x, PIVOT.y, PIVOT.z)
    .rotate(g_mouseYAngle, 0,1,0)
    .translate(-PIVOT.x, -PIVOT.y, -PIVOT.z);
  const fullView = new Matrix4(g_camera.viewMatrix).multiply(orbit);
  gl.uniformMatrix4fv(u_ViewMatrix, false, fullView.elements);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, new Matrix4().elements);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const floor = new Cube();
  floor.textureNum = -2; floor.color = [1,1,1,1];
  floor.matrix.setIdentity()
    .translate(-cols/2, -0.75, -rows/2)
    .scale(cols, 0.01, rows);
  floor.render();

  var sky = new Cube();
  sky.color = [1,0,0,1];
  sky.textureNum = 0;
  sky.matrix.scale(50,50,50);
  sky.matrix.translate(-.5,-.5,-.5);
  sky.render();

  drawMap();

  for (const s of g_shapesList) s.render();

  const ms = performance.now() - startTime;
  sendTextToHTML(`numdot:${g_shapesList.length} ms:${Math.floor(ms)} fps:${Math.floor(1000/ms)}`, 'numdot');
}

function main() {
  setupWebGL();
  connectVariablesToGLSL();
  addActionsForHtmlUI();
  initTextures();
  g_camera = new Camera(canvas);
  canvas.onmousedown = ev => { if(ev.button===0){ g_mouseDragging=true; g_lastMouseX=ev.clientX; g_lastMouseY=ev.clientY; g_startYAngle=g_mouseYAngle; g_startXAngle=g_mouseXAngle; }};
  canvas.onmousemove = ev => { if(g_mouseDragging) updateRotation(ev); };
  canvas.onmouseup   = ev => { if(ev.button===0) g_mouseDragging=false; };
  document.onkeydown = keydown;
  requestAnimationFrame(function tick(){ renderAllShapes(); requestAnimationFrame(tick); });
}

function updateRotation(ev) {
  g_mouseYAngle = g_startYAngle + (ev.clientX - g_lastMouseX)/canvas.width * 180;
  g_mouseXAngle = g_startXAngle - (ev.clientY - g_lastMouseY)/canvas.height * 180;
}

function keydown(ev) {
  const speed = .2;
  const turn  = 5;  // degrees per keypress

  switch (ev.key) {
    case 'w':
      g_camera.moveForward(speed);
      break;
    case 's':
      g_camera.moveBackwards(speed);
      break;
    case 'a':
      g_camera.moveLeft(speed);
      break;
    case 'd':
      g_camera.moveRight(speed);
      break;
    case 'e':  // spin right
      g_mouseYAngle += turn;
      break;
    case 'q':  // spin left
      g_mouseYAngle -= turn;
      break;
  }
}


function sendTextToHTML(text,id){ document.getElementById(id).innerText = text; }
