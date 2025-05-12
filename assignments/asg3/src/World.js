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
  }`

// Fragment shader program
var FSHADER_SOURCE =`
  precision mediump float;
  varying vec2 v_UV;
  uniform vec4 u_FragColor;
  uniform sampler2D u_Sampler0;
  uniform int u_whichTexture;
  void main() {
    if (u_whichTexture == -2) {
      gl_FragColor = u_FragColor; // Use color
    }
    else if (u_whichTexture == -1) {
      gl_FragColor = vec4(v_UV, 1.0, 1.0); // Use UV debug color
    }
    else if (u_whichTexture == 0) {
      gl_FragColor = texture2D(u_Sampler0, v_UV); // Use texture
    }
    else {
      gl_FragColor = vec4(1, .2, .2, 1); // Error, put redish
    }
  }`

// GL and GLSL handles
let canvas;
let gl;
let a_Position;
let a_UV;
let u_FragColor;
let u_Size;
let u_ModelMatrix;
let u_ViewMatrix;
let u_ProjectionMatrix;
let u_GlobalRotateMatrix;
let u_Sampler0;
let u_whichTexture;

// Animation angles
let g_yellowAngle = 0;
let g_magentaAngle = 0;
let g_yellowAnimation = false;
let g_magentaAnimation = false;

// Mouse rotation angles
let g_mouseXAngle = 0;
let g_mouseYAngle = 0;

// for relative drag:
let g_lastMouseX = 0, g_lastMouseY = 0;
let g_startXAngle = 0, g_startYAngle = 0;


// Dragging flag for rotation
let g_mouseDragging = false;

// List of all drawn shapes
let g_shapesList = [];

// Pivot point around which to orbit (center of the animal)
const PIVOT = { x: 0, y: -0.5, z: 0 };

function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
  if (!gl) {
    console.error('Failed to get WebGL context');
  }
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.6, 0.8, 1.0, 1.0);
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.error('Failed to initialize shaders.');
    return;
  }
  a_Position    = gl.getAttribLocation(gl.program, 'a_Position');
  a_UV    = gl.getAttribLocation(gl.program, 'a_UV');
  u_FragColor   = gl.getUniformLocation(gl.program, 'u_FragColor');
  u_Size        = gl.getUniformLocation(gl.program, 'u_Size');
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
  u_ViewMatrix   = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjectionMatrix   = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  u_Sampler0   = gl.getUniformLocation(gl.program, 'u_Sampler0');
  u_whichTexture = gl.getUniformLocation(gl.program, 'u_whichTexture');


  var identityM = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);
}

function addActionsForHtmlUI() {

  document.getElementById('animationYellowOnButton').onclick  = () => g_yellowAnimation = true;
  document.getElementById('animationYellowOffButton').onclick = () => g_yellowAnimation = false;
  document.getElementById('animationMagentaOnButton').onclick = () => g_magentaAnimation = true;
  document.getElementById('animationMagentaOffButton').onclick= () => g_magentaAnimation = false;
}

function initTextures() {
  var image = new Image();
  if (!image) {
    console.log('Failed to create the image object');
    return false;
  }

  image.onload = function() {
    sendTextureToTEXTURE0(image);
  };
  image.src = 'sky.png';

  return true;
}

function sendTextureToTEXTURE0(image) {
  var texture = gl.createTexture();
  if(!texture) {
    console.log('Failed to create the texture object');
    return false;
  }

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
  gl.uniform1i(u_Sampler0, 0);

  console.log('finished loadTexture');
}

function main() {
  setupWebGL();
  connectVariablesToGLSL();
  addActionsForHtmlUI();
  initTextures(gl, 0);

  g_camera = new Camera(canvas);
  gl.clearColor(0.6, 0.8, 1.0, 1.0);

  // Mouse events: only camera‐drag on down/move/up

    canvas.onmousedown = ev => {
      if (ev.button === 0) {
        g_mouseDragging = true;
        // record where the drag started:
        g_lastMouseX   = ev.clientX;
        g_lastMouseY   = ev.clientY;
        // record the camera’s current angles:
        g_startYAngle  = g_mouseYAngle;
        g_startXAngle  = g_mouseXAngle;
      }
    };

    document.onkeydown = keydown;

    canvas.onmousemove = ev => {
      if (g_mouseDragging) {
        updateRotation(ev);
      }
    };

    canvas.onmouseup = ev => {
      if (ev.button === 0) {
        g_mouseDragging = false;
      }
    };

    canvas.oncontextmenu = ev => ev.preventDefault();

    gl.clearColor(0,0,0,1);
    requestAnimationFrame(tick);
  }


function updateRotation(ev) {
  // how far we’ve moved since mousedown:
  const dx = ev.clientX - g_lastMouseX;
  const dy = ev.clientY - g_lastMouseY;
  // translate pixels → degrees (180° across full width/height):
  g_mouseYAngle = g_startYAngle + (dx / canvas.width)  * 180;
  g_mouseXAngle = g_startXAngle - (dy / canvas.height) * 180;
}

let g_startTime = performance.now()/1000;
let g_seconds   = 0;

function tick() {
  g_seconds = performance.now()/1000 - g_startTime;
  updateAnimationAngles();
  renderAllShapes();
  requestAnimationFrame(tick);
}

function keydown(ev) {
  const speed = 0.2;
  const turn = 2;

  switch(ev.key) {
    case 'w': g_camera.moveForward(speed); break;
    case 's': g_camera.moveBackwards(speed); break;
    case 'a': g_camera.moveLeft(speed); break;
    case 'd': g_camera.moveRight(speed); break;
    case 'q': g_camera.panLeft(turn); break;
    case 'e': g_camera.panRight(turn); break;
  }

  renderAllShapes();
  console.log(ev.keycode);
}

function updateAnimationAngles() {
  if (g_yellowAnimation)  g_yellowAngle  = 45 * Math.sin(g_seconds);
  if (g_magentaAnimation) g_magentaAngle = 45 * Math.sin(3 * g_seconds);
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

var g_eye = [0,0,3];
var g_at = [0,0,-100];
var g_up = [0,1,0];

var g_map = [
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 1, 1, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1],
];

function renderAllShapes() {
  const startTime = performance.now();

  // 1) Update camera’s projection for any canvas resize:
  g_camera.resize();
  gl.uniformMatrix4fv(
    u_ProjectionMatrix,
    false,
    g_camera.projectionMatrix.elements
  );

  // 2) Build an “orbit” around your PIVOT (for mouse drag):
  const orbit = new Matrix4()
    .translate(PIVOT.x, PIVOT.y, PIVOT.z)
    .rotate(g_mouseYAngle, 0,1,0)
    .rotate(g_mouseXAngle, 1,0,0)
    .translate(-PIVOT.x, -PIVOT.y, -PIVOT.z);

  // 3) Combine lookAt + orbit into one full view matrix:
  const fullView = new Matrix4(g_camera.viewMatrix)
    .multiply(orbit);
  gl.uniformMatrix4fv(
    u_ViewMatrix,
    false,
    fullView.elements
  );

  // 4) We baked the orbit into fullView, so global-rotate is now identity:
  gl.uniformMatrix4fv(
    u_GlobalRotateMatrix,
    false,
    new Matrix4().elements
  );

  // 5) Clear the frame and depth buffer before drawing:
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // 7) Draw any 2D shapes you added with click():
  for (const s of g_shapesList) {
    s.render();
  }

  // 8) Draw the animal body (textured):
  const body = new Cube();
  body.textureNum = 0;
  body.color      = [1,0,0,1];
  body.matrix.setIdentity()
    .translate(-0.25, -0.75, -0.25)
    .rotate(-5,   1,0,0)
    .scale(0.5, 0.3, 0.5);
  body.render();

  // 9) Draw the yellow arm (UV-gradient):
  const yellow = new Cube();
  yellow.textureNum = -1;
  yellow.color      = [1,1,0,1];
  yellow.matrix
  .setIdentity()
  .translate(-0.125, -0.5, -0.25)       // half of 0.25 in X, half of 0.5 in Z
  .rotate(-5,1,0,0)
  .rotate(-g_yellowAngle, 0,0,1)
  .scale(0.25, 0.7, 0.5);
  yellow.render();

  // 10) Draw the magenta “hand” (textured):
  const magenta = new Cube();
  magenta.textureNum = 0;
  magenta.color      = [1,0,1,1];
  magenta.matrix = new Matrix4(yellow.matrix)
  .translate(-0.15, 0.65, -0.15)
  .rotate(g_magentaAngle, 0,0,1)
  .scale(0.3, 0.3, 0.3);
  magenta.render();

  const floor = new Cube();
  floor.textureNum = -2;
  floor.color      = [0.2, 0.8, 0.2, 1];
  floor.matrix
    .setIdentity()
    .translate(-5,  -0.75, -5)  // move back by half‐width & half‐depth
    .scale    (10, 0.01, 10);
  floor.render();

  // 12) Show performance stats:
  const ms = performance.now() - startTime;
  sendTextToHTML(
    `numdot: ${g_shapesList.length}   ms: ${Math.floor(ms)}   fps: ${Math.floor(1000/ms)}`,
    'numdot'
  );
}


function sendTextToHTML(text, htmlID) {
  const elm = document.getElementById(htmlID);
  if (!elm) {
    console.error(`Failed to find HTML element "${htmlID}"`);
    return;
  }
  elm.innerHTML = text;
}
