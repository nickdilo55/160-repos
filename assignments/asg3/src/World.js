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

function renderAllShapes() {
  var startTime = performance.now();

  var projMat = new Matrix4();
  projMat.setPerspective(60, canvas.width/canvas.height, 1, 100);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, projMat.elements);

  var viewMat = new Matrix4();
  viewMat.setLookAt(g_eye[0], g_eye[1], g_eye[2], g_at[0], g_at[1], g_at[2], g_up[0], g_up[1], g_up[2]);
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMat.elements);

  // Orbit camera around PIVOT
  const view = new Matrix4()
    .translate(PIVOT.x, PIVOT.y, PIVOT.z)
    .rotate(g_mouseYAngle, 0,1,0)
    .rotate(g_mouseXAngle, 1,0,0)
    .translate(-PIVOT.x, -PIVOT.y, -PIVOT.z);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, view.elements);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Draw shapes
  for (const s of g_shapesList) s.render();

  // Draw the animal
  const body = new Cube();
  body.textureNum = 0;
  body.color = [1,0,0,1];
  body.matrix.setIdentity()
    .translate(-0.25,-0.75,0)
    .rotate(-5,1,0,0)
    .scale(0.5,0.3,0.5);
  body.render();

  const yellow = new Cube();
  yellow.color = [1,1,0,1];
  yellow.matrix.setTranslate(0,-0.5,0)
    .rotate(-5,1,0,0)
    .rotate(-g_yellowAngle,0,0,1);
  const yellowBase = new Matrix4(yellow.matrix);
  yellow.matrix.scale(0.25,0.7,0.5)
    .translate(-0.5,0,0);
  yellow.render();

  const magenta = new Cube();
  magenta.color = [1,0,1,1];
  magenta.matrix = yellowBase
    .translate(0,0.65,0)
    .rotate(g_magentaAngle,0,0,1)
    .scale(0.3,0.3,0.3)
    .translate(-0.5,0,-0.001);
  magenta.render();

  var ground = new Cube();
  ground.matrix.translate(0,0,-1);
  ground.matrix.scale(2,.1,2);
  ground.render();

  const duration = performance.now() - startTime;
  sendTextToHTML(
    `numdot: ${g_shapesList.length}   ms: ${Math.floor(duration)}   fps: ${Math.floor(1000/duration)}`,
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
