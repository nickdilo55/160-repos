// BlockyAnimal.js

// Vertex shader
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform float u_Size;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  void main() {
    gl_Position = u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
    gl_PointSize = u_Size;
  }`;

// Fragment shader
var FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }`;

// GL & GLSL handles
let canvas, gl;
let a_Position, u_FragColor, u_Size, u_ModelMatrix, u_GlobalRotateMatrix;

let g_paused = false;   // when true, we don’t advance any of the animations

// Animation angles
let g_frontLegAngle   = 0,
    g_backLegAngle    = 0;

    // after your other let-statements:
let g_headAngle  = 20;   // default “nose-down” tilt


// Leg‐fall state
let g_legsFalling   = false,
    g_legFallOffset = 0;
const LEG_FALL_SPEED = 2.0;  // world units/sec

// Time tracking
let g_startTime = performance.now() / 1000,
    g_prevTime  = g_startTime,
    g_seconds   = 0;

// Camera‐drag state
let g_mouseXAngle = 0,
    g_mouseYAngle = 0,
    g_lastMouseX  = 0,
    g_lastMouseY  = 0,
    g_startXAngle = 0,
    g_startYAngle = 0,
    g_mouseDragging = false;

// List of 2D shapes drawn by clicks
let g_shapesList = [];

// Pivot for orbiting camera
const PIVOT = { x:0, y:-0.5, z:0 };

function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
  if (!gl) {
    console.error('WebGL not supported');
    return;
  }
  gl.enable(gl.DEPTH_TEST);
  gl.clearDepth(1.0);
  gl.clearColor(0.6, 0.8, 1.0, 1.0);
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.error('Failed to initialize shaders.');
    return;
  }
  a_Position           = gl.getAttribLocation(gl.program, 'a_Position');
  u_FragColor          = gl.getUniformLocation(gl.program, 'u_FragColor');
  u_Size               = gl.getUniformLocation(gl.program, 'u_Size');
  u_ModelMatrix        = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
}

function addActionsForHtmlUI() {
  document.getElementById('pauseAnim').onclick  = () => { g_paused = false; };
  document.getElementById('resumeAnim').onclick = () => { g_paused = true; };
  document.getElementById('headSlider').oninput  = e => {
    g_headAngle  = +e.target.value;
    renderAllShapes();
  };
}

function main() {
  setupWebGL();
  connectVariablesToGLSL();
  addActionsForHtmlUI();

  // Mouse down: shift‐click toggles legs falling, else start drag
  canvas.onmousedown = ev => {
    if (ev.shiftKey && ev.button === 0) {
      g_legsFalling = !g_legsFalling;
      if (!g_legsFalling) g_legFallOffset = 0;
      return;
    }
    if (ev.button === 0) {
      g_mouseDragging = true;
      g_lastMouseX = ev.clientX;
      g_lastMouseY = ev.clientY;
      g_startXAngle = g_mouseXAngle;
      g_startYAngle = g_mouseYAngle;
    }
  };
  canvas.onmousemove = ev => {
    if (g_mouseDragging) updateRotation(ev);
  };
  canvas.onmouseup = ev => {
    if (ev.button === 0) g_mouseDragging = false;
  };
  canvas.oncontextmenu = ev => ev.preventDefault();

  requestAnimationFrame(tick);
}

function updateRotation(ev) {
  const dx = ev.clientX - g_lastMouseX;
  const dy = ev.clientY - g_lastMouseY;
  g_mouseYAngle = g_startYAngle + dx / canvas.width  * 180;
  g_mouseXAngle = g_startXAngle - dy / canvas.height * 180;
}

function tick(now) {
  now = now / 1000;                  // convert ms to s
  const delta = now - g_prevTime;
  g_prevTime = now;
  g_seconds  = now - g_startTime;

  updateAnimationAngles();
  updateLegFall(delta);

  renderAllShapes();
  requestAnimationFrame(tick);
}

function updateAnimationAngles() {
  if (g_paused) {
    // zero-out or leave at last pose:
    // g_frontLegAngle = g_backLegAngle = 0;
    return;
  }

  // simple walk-cycle:
  g_frontLegAngle = 30 * Math.sin(g_seconds * 2);
  g_backLegAngle  = -30 * Math.sin(g_seconds * 2);
}


function updateLegFall(delta) {
  if (g_legsFalling) {
    g_legFallOffset += LEG_FALL_SPEED * delta;
  }
}

function click(ev) {
  const [x, y] = convertCoordinatesEventToGL(ev);
  let shape;
  if (g_selectedType === POINT)       shape = new Point();
  else if (g_selectedType === TRIANGLE) shape = new Triangle();
  else                                  shape = new Circle();
  shape.position = [x, y];
  shape.color    = g_selectedColor.slice();
  shape.size     = g_selectedSize;
  g_shapesList.push(shape);
  renderAllShapes();
}

function convertCoordinatesEventToGL(ev) {
  let x = ev.clientX, y = ev.clientY;
  const rect = ev.target.getBoundingClientRect();
  x = ((x - rect.left) - canvas.width/2) / (canvas.width/2);
  y = (canvas.height/2 - (y - rect.top)) / (canvas.height/2);
  return [x, y];
}

function drawAnimal() {
  // Colors
  const hoofColor = [0.8, 0.8, 0.8, 1.0];
  const bodyColor = [0.50, 0.30, 0.10, 1.0];

  // Leg dims
  const legThickness  = 0.225;
  const shinThickness = legThickness * 0.8;
  const toeThickness  = shinThickness * 0.7;
  const toeLength     = 0.1;

  // Positions / heights
  const frontZ =  0.3, backZ = -0.3;
  const frontY = -0.6, backY = -0.5;
  const frontH =  0.4, backH  =  0.3;

  // Head & nose params
  const headSize  = 0.6;
  const headY     = -0.5 + frontH/2 + headSize/2;
  const headWidth = headSize * 0.6,
        headHeight= headSize * 1.0,
        headDepth = headSize * 0.4;
  const headX     = -0.2 + (headSize - headWidth)/2;

  const noseLength    = 0.5;
  const noseThickness = 0.15;
  const headFrontX    = -0.2 + headSize/2;
  const zOffset       = 0.001;

  // Nose verts in world space
  const v0 = [ headFrontX + noseLength, headY, frontZ + zOffset ];
  const v1 = [ headFrontX,              headY + noseThickness/2, frontZ + zOffset ];
  const v2 = [ headFrontX,              headY - noseThickness/2, frontZ + zOffset ];
  const noseVerts = [...v0, ...v1, ...v2];

  // FRONT LEGS
  [ -0.4, 0.4 ].forEach(x => {
    const base = new Matrix4().setIdentity()
      .translate(x, frontY + frontH/2, frontZ)
      .rotate(g_frontLegAngle, 1,0,0)
      .translate(0, -g_legFallOffset, 0);

    const upper = new Cube();
    upper.color = bodyColor;
    upper.matrix = new Matrix4(base)
      .translate(0, -frontH/2, 0)
      .scale(legThickness, frontH, legThickness);
    upper.render();

    const lower = new Cube();
    lower.color = bodyColor;
    lower.matrix = new Matrix4(base)
      .translate(0.02, -frontH + 0.25, 0)
      .rotate(g_frontLegAngle, 1,0,0)
      .translate(0, -frontH/2, 0)
      .scale(shinThickness, frontH - 0.175, shinThickness);
    lower.render();

    const toe = new Cube();
    toe.color = hoofColor;
    toe.matrix = new Matrix4(base)
      .translate(0.05, -frontH + 0.25, 0)
      .rotate(g_frontLegAngle, 1,0,0)
      .translate(0, -frontH/2, 0)
      .rotate(g_frontLegAngle, 1,0,0)
      .translate(0, -((frontH - 0.175)/2 + toeLength/2 - 0.065), 0)
      .scale(toeThickness, toeLength, toeThickness);
    toe.render();
  });

  // HEAD (thinned)
  const head = new Cube();
  head.color = bodyColor;
  head.matrix.setIdentity()
    .translate(headX, headY - 0.05, frontZ - 0.05)
    .rotate(g_headAngle, 1, 0, 0)
    .scale(headWidth, headHeight, headDepth + .3);
  head.render();

  // NOSE (3D triangle)
  gl.uniformMatrix4fv(u_ModelMatrix, false, new Matrix4().setIdentity().elements);
  gl.uniform4f(u_FragColor, bodyColor[0], bodyColor[1], bodyColor[2], bodyColor[3]);
  drawTriangle3D(noseVerts);

  // BACK LEGS
  [ -0.4, 0.4 ].forEach(x => {
    const baseLeg = new Matrix4().setIdentity()
      .translate(x, backY + backH/2, backZ)
      .rotate(g_backLegAngle, 1,0,0)
      .translate(0, -g_legFallOffset, 0);

    const upper = new Cube();
    upper.color = bodyColor;
    upper.matrix = new Matrix4(baseLeg)
      .translate(0, -backH/2, 0)
      .scale(legThickness, backH, legThickness);
    upper.render();

    const lower = new Cube();
    lower.color = bodyColor;
    lower.matrix = new Matrix4(baseLeg)
      .translate(0, -backH + 0.15, 0)
      .rotate(g_backLegAngle, 1,0,0)
      .translate(0, -backH/2, 0)
      .scale(shinThickness, backH, shinThickness);
    lower.render();

    const baseToe = new Matrix4(baseLeg).translate(0, 0, 0.05);
    const toe = new Cube();
    toe.color = hoofColor;
    toe.matrix = new Matrix4(baseToe)
      .translate(0, -backH + 0.15, 0)
      .rotate(g_backLegAngle, 1,0,0)
      .translate(0, -backH/2, 0)
      .rotate(g_backLegAngle, 1,0,0)
      .translate(0, -(backH/2 + toeLength/2 - 0.1), 0)
      .scale(toeThickness, toeLength, toeThickness);
    toe.render();
  });

  // BODY
  const body = new Cube();
  body.color = bodyColor;
  body.matrix.setIdentity()
    .translate(-0.4, -0.35, -0.3)
    .scale(
      2 * 0.4 + legThickness,
      0.4,
      Math.abs(frontZ - backZ) + legThickness
    );
  body.render();
}

function renderAllShapes() {
  const startTime = performance.now();

  // Orbit camera
  const view = new Matrix4()
    .translate(PIVOT.x, PIVOT.y, PIVOT.z)
    .rotate(g_mouseYAngle, 0,1,0)
    .rotate(g_mouseXAngle, 1,0,0)
    .translate(-PIVOT.x, -PIVOT.y, -PIVOT.z);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, view.elements);

  // Clear
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // 2D shapes
  for (const s of g_shapesList) s.render();

  // 3D horse
  drawAnimal();

  // Stats
  const duration = performance.now() - startTime;
  sendTextToHTML(
    `numdot: ${g_shapesList.length}   ms: ${Math.floor(duration)}   fps: ${Math.floor(1000/duration)}`,
    'numdot'
  );
}

function sendTextToHTML(text, htmlID) {
  const elm = document.getElementById(htmlID);
  if (elm) elm.innerHTML = text;
}
