var VSHADER_SOURCE = `
  precision mediump float;
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  varying vec2 v_UV;
  attribute vec3 a_Normal;
  varying vec3 v_Normal;
  varying vec4 v_vertPos;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  void main() {
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
    v_UV = a_UV;
    v_Normal = a_Normal;
    v_vertPos = u_ModelMatrix * a_Position;
  }`;

  var FSHADER_SOURCE = `
    precision mediump float;

    varying vec2  v_UV;
    varying vec3  v_Normal;
    varying vec4  v_vertPos;

    uniform vec4    u_FragColor;
    uniform sampler2D u_Sampler0, u_Sampler1, u_Sampler2;
    uniform int     u_whichTexture;

    uniform vec3   u_lightPos;
    uniform vec3   u_cameraPos;
    uniform bool   u_lightOn;

    void main() {
      // 1) pick the base color
      vec4 baseColor;
      if      (u_whichTexture == -2) baseColor = u_FragColor;
      else if (u_whichTexture == -1) baseColor = vec4(v_UV, 1.0, 1.0);
      else if (u_whichTexture ==  0) baseColor = texture2D(u_Sampler0, v_UV);
      else if (u_whichTexture ==  1) baseColor = texture2D(u_Sampler1, v_UV);
      else if (u_whichTexture ==  2) baseColor = texture2D(u_Sampler2, v_UV);
      else if (u_whichTexture == -3) baseColor = vec4((v_Normal + 1.0)/2.0, 1.0);
      else                            baseColor = vec4(1.0, 0.2, 0.2, 1.0);

      // 2) if the light is off, just show the base color
      if (!u_lightOn) {
        gl_FragColor = baseColor;
        return;
      }

      // 3) otherwise compute Phong + attenuation
      vec3 pos    = vec3(v_vertPos);
      vec3 Lvec   = u_lightPos - pos;
      float r     = length(Lvec);
      vec3 L      = normalize(Lvec);
      vec3 N      = normalize(v_Normal);
      vec3 R      = reflect(-L, N);
      vec3 E      = normalize(u_cameraPos - pos);

      float nDotL = max(dot(N, L), 0.0);
      float spec  = pow(max(dot(E, R), 0.0), 10.0);
      vec3  diffuse = baseColor.rgb * nDotL;
      vec3  ambient = baseColor.rgb * 0.3;

      // simple attenuation
      float att = 1.0 / (0.2 + 0.2*r + 0.5*r*r);
      diffuse *= att;
      spec    *= att;
      ambient *= att;

      // 4) final lit color
      vec3 lit = ambient + diffuse + spec;
      gl_FragColor = vec4(lit, baseColor.a);
    }`;


let canvas, gl;
let a_Position, a_UV;
let u_FragColor, u_Size;
let a_Normal, u_lightPos;
let u_ModelMatrix, u_ViewMatrix, u_ProjectionMatrix, u_GlobalRotateMatrix;
let u_Sampler0, u_Sampler1, u_whichTexture;
let hedgeTexture;
let g_mouseXAngle = 0, g_mouseYAngle = 0;
let g_lastMouseX = 0, g_lastMouseY = 0;
let g_startXAngle = 0, g_startYAngle = 0;
let g_mouseDragging = false;
let g_NormalOn = false;
let g_lightPos=[0,1,-2];
let g_startTime = null;
let u_cameraPos;
let g_lightOn = true;

let g_shapesList = [];

const PIVOT = { x: 0, y: -0.5, z: 0 };
const MAP_SIZE = 32;
function generateMaze(size) {
  const map = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => 1)
  );
  const stack = [];
  const start = [1, 1];
  map[start[1]][start[0]] = 0;
  stack.push(start);

  const dirs = [
    [ 2,  0],
    [-2,  0],
    [ 0,  2],
    [ 0, -2],
  ];

  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const neighbors = dirs
      .map(([dx, dy]) => [x + dx, y + dy, x + dx/2, y + dy/2])
      .filter(([nx, ny]) =>
        nx > 0 && nx < size - 1 &&
        ny > 0 && ny < size - 1 &&
        map[ny][nx] === 1
      );

    if (neighbors.length) {
      const [nx, ny, wx, wy] = neighbors[
        Math.floor(Math.random() * neighbors.length)
      ];
      map[wy][wx] = 0;
      map[ny][nx] = 0;
      stack.push([nx, ny]);
    } else {
      stack.pop();
    }
  }

  return map;
}

function clearCenter(map, radius = 3) {
  const center = Math.floor(map.length / 2);
  for (let y = center - radius; y <= center + radius; y++) {
    for (let x = center - radius; x <= center + radius; x++) {
      map[y][x] = 0;
    }
  }
}

let g_map = generateMaze(MAP_SIZE);
clearCenter(g_map, 3);

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
  a_Normal             = gl.getAttribLocation(gl.program, 'a_Normal');
  u_FragColor          = gl.getUniformLocation(gl.program, 'u_FragColor');
  u_Size               = gl.getUniformLocation(gl.program, 'u_Size');
  u_ModelMatrix        = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
  u_ViewMatrix         = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjectionMatrix   = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  u_Sampler0           = gl.getUniformLocation(gl.program, 'u_Sampler0');
  u_Sampler1           = gl.getUniformLocation(gl.program, 'u_Sampler1');
  u_Sampler2           = gl.getUniformLocation(gl.program, 'u_Sampler2');
  u_whichTexture       = gl.getUniformLocation(gl.program, 'u_whichTexture');
  u_lightPos           = gl.getUniformLocation(gl.program, 'u_lightPos');
  u_cameraPos          = gl.getUniformLocation(gl.program, 'u_cameraPos');
  u_lightOn            = gl.getUniformLocation(gl.program, 'u_lightOn');

  const identityM = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);
}

function initTextures() {
  const skyImg = new Image();
  skyImg.onload = () => {
    const tex0 = gl.createTexture();
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex0);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, skyImg
    );
    gl.uniform1i(u_Sampler0, 0);
  };
  skyImg.src = 'sky.png';

  const hedgeImg = new Image();
  hedgeImg.onload = () => {
    const tex1 = gl.createTexture();
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, tex1);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, hedgeImg
    );
    gl.uniform1i(u_Sampler1, 1);
  };
  hedgeImg.src = 'hedge.png';

  const stoneImg = new Image();
  stoneImg.onload = () => {
    const tex2 = gl.createTexture();
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, tex2);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texImage2D(
      gl.TEXTURE_2D, 0,
      gl.RGB, gl.RGB, gl.UNSIGNED_BYTE,
      stoneImg
    );
    gl.uniform1i(u_Sampler2, 2);
  };
  stoneImg.src = 'stone.png';

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
      if (g_map[z][x] === 1 || g_map[z][x] === 2) {
        const wall = new Cube();
        wall.textureNum = g_map[z][x] === 1 ? 1 : 2;
        wall.matrix.setIdentity()
            .translate( x - halfW + .5,
                        floorTopY + .5,
                        z - halfD + .5 )
            .scale(1,1,1);
        wall.render();
      }
    }
  }
}

function addActionsForHTMLUI() {
  document.getElementById('normalOn').onclick = function() {g_NormalOn = true;};
  document.getElementById('normalOff').onclick = function() {g_NormalOn = false;};

  document.getElementById('lightOn') .onclick = () => { g_lightOn  = true;  renderAllShapes(); };
  document.getElementById('lightOff').onclick = () => { g_lightOn  = false; renderAllShapes(); };

  document.getElementById('lightSlideX').addEventListener('mousemove', function(ev) {if(ev.buttons == 1) {g_lightPos[0] = this.value/100; renderAllShapes();}});
  document.getElementById('lightSlideY').addEventListener('mousemove', function(ev) {if(ev.buttons == 1) {g_lightPos[1] = this.value/100; renderAllShapes();}});
  document.getElementById('lightSlideZ').addEventListener('mousemove', function(ev) {if(ev.buttons == 1) {g_lightPos[2] = this.value/100; renderAllShapes();}});
}

function renderAllShapes() {
  // resize & camera
  g_camera.resize();
  gl.uniformMatrix4fv(u_ProjectionMatrix,false,g_camera.projectionMatrix.elements);
  gl.uniformMatrix4fv(u_ViewMatrix,false,     g_camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix,false,new Matrix4().elements);

  // clear
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


  // Skybox (Cube)
  const sky = new Cube();
  sky.textureNum = g_NormalOn ? -3 : 0;
  sky.color      = [1,1,1,1];
  sky.matrix.setIdentity()
             .scale(-50,-50,-50)
             .translate(-0.5,-0.5,-0.5);
  sky.render();

  gl.uniform3f(u_lightPos, g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  const camPos = getCameraPos();
  gl.uniform3f(u_cameraPos,
    camPos.x,
    camPos.y,
    camPos.z
  );

  drawMap();

  gl.uniform1i(u_lightOn, g_lightOn);

  const floor = new Cube();
  floor.textureNum = -2; floor.color = [1,1,1,1];
  floor.matrix.setIdentity()
    .translate(-MAP_SIZE/2, -1.2, -MAP_SIZE/2)
    .scale(MAP_SIZE, 0.01, MAP_SIZE);
  floor.render();

  var light = new Cube();
  light.color = [2,2,0,1];
  light.matrix.translate(g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  light.matrix.scale(-.1,-.1,-.1);
  light.matrix.translate(-.5,-.5,-.5);
  light.render();

  // Sphere in scene
  const ball = new Sphere();
  ball.textureNum = g_NormalOn ? -3 : 2;  // 2 = stone.png slot
  ball.color      = [1,1,1,1];
  ball.matrix.setIdentity()
             .translate(0,1,0)
             .scale(1,1,1);
  ball.render();
}

function tick(now) {
  if (g_startTime === null) g_startTime = now;
  const t = (now - g_startTime) * 0.001;

  // only auto-move X when the user isn’t dragging the X-slider:
  if (!document.getElementById('lightSlideX').matches(':active')) {
    g_lightPos[0] = Math.cos(t);
  }

  renderAllShapes();
  requestAnimationFrame(tick);
}

function main() {
  setupWebGL();
  connectVariablesToGLSL();
  initTextures();
  addActionsForHTMLUI()
  g_camera = new Camera(canvas);
  canvas.onmousedown = ev => {
    if (ev.button === 0) {
      g_mouseDragging = true;
      g_lastMouseX   = ev.clientX;
      g_lastMouseY   = ev.clientY;
    }
  };
  canvas.onmousemove = ev => {
    if (!g_mouseDragging) return;
    const dx = ev.clientX - g_lastMouseX;
    const dy = ev.clientY - g_lastMouseY;
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
    const yaw   = -dx / canvas.width  * 180;
    const pitch = 0;
    g_camera.pan(yaw, pitch);
  };
  canvas.onmouseup = ev => {
    if (ev.button === 0) g_mouseDragging = false;
  };
  document.onkeydown = keydown;
  g_startTime = performance.now();
  requestAnimationFrame(tick);
}

function keydown(ev) {
  const speed = .2;
  const turn  = 5;

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
      case 'e':
      g_camera.pan(-turn, 0 );
      break;
    case 'q':
      g_camera.pan(turn, 0 );
      break;
    case 'p': {
      const { row, col } = getFacingCell(1);
      if (
        row >= 0 && row < MAP_SIZE &&
        col >= 0 && col < MAP_SIZE &&
        g_map[row][col] === 0
      ) {
        g_map[row][col] = 2;
      }
      break;
    }
    case 'r': {
      const { row, col } = getFacingCell(1);
      if (
        row >= 0 && row < MAP_SIZE &&
        col >= 0 && col < MAP_SIZE &&
        (g_map[row][col] === 1 || g_map[row][col] === 2)
      ) {
        g_map[row][col] = 0;
      }
      break;
    }
  }
}

function getCameraPos() {
  const e = g_camera.transform.elements;
  return { x: e[12], y: e[13], z: e[14] };
}

function getFacingCell(maxReach = 1) {
  const pos = getCameraPos();
  const yawRad = g_mouseYAngle * Math.PI/180;
  const dirX   = -Math.sin(yawRad);
  const dirZ   = -Math.cos(yawRad);

  const tx = pos.x + dirX * maxReach;
  const tz = pos.z + dirZ * maxReach;

  const col = Math.floor(tx + MAP_SIZE/2);
  const row = Math.floor(tz + MAP_SIZE/2);
  return { row, col };
}


function sendTextToHTML(text,id){ document.getElementById(id).innerText = text; }
