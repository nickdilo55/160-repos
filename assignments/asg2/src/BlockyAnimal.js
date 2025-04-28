// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform float u_Size;
  void main() {
    gl_Position = a_Position;
    //gl_PointSize = 10.0;
    gl_PointSize = u_Size;
  }`

// Fragment shader program
var FSHADER_SOURCE =`
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }`

// Global Variables
let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_Size

function setupWebGL() {
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  // gl = getWebGLContext(canvas);
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
}

function connectVariablesToGLSL() {
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // // Get the storage location of a_Position
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  // Get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  // Get the storage location of u_Size
  u_Size = gl.getUniformLocation(gl.program, 'u_Size');
  if (!u_Size) {
    console.log('Failed to get the storage location of u_Size');
    return;
  }
}

// Constants
const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2;

// Globals related UI elements
let g_selectedColor = [1.0, 1.0, 1.0, 1.0];
let g_selectedSize = 5.0;
let g_seletcedType = POINT;
let g_seletcedSegment = 10;
let g_selectedAlpha = 1.0;
let g_spectrumDraw = false;
let g_lastMousePos = null;
let g_lastMouseTime = null;
let g_kaleidoscopeMode = false;
let g_kaleidoscopeSegments = 6;

function addActionsForHtmlUI() {
  // Button events (shape type)
  document.getElementById('green').onclick = function() { g_selectedColor = [0.0, 1.0, 0.0, 1.0]; };
  document.getElementById('red').onclick = function() { g_selectedColor = [1.0, 0.0, 0.0, 1.0]; };
  document.getElementById('clearButton').onclick = function() { g_shapesList = []; renderAllShapes(); };
  
  document.getElementById('pointButton').onclick = function() { g_seletcedType = POINT };
  document.getElementById('triangleButton').onclick = function() { g_seletcedType = TRIANGLE };
  document.getElementById('circleButton').onclick = function() { g_seletcedType = CIRCLE };

  // Color slider events
  document.getElementById('redSlide').addEventListener('mouseup', function() { g_selectedColor[0] = this.value / 100; });
  document.getElementById('greenSlide').addEventListener('mouseup', function() { g_selectedColor[1] = this.value / 100; });
  document.getElementById('blueSlide').addEventListener('mouseup', function() { g_selectedColor[2] = this.value / 100; });
  
  // Slider events
  document.getElementById('sizeSlide').addEventListener('mouseup', function() { g_selectedSize = this.value; });
  document.getElementById('segmentSlide').addEventListener('mouseup', function() { g_seletcedSegment = this.value; });
  document.getElementById('alphaSlide').addEventListener('mouseup', function() { 
    g_selectedAlpha = this.value / 100;
    g_selectedColor[3] = g_selectedAlpha;
  });

  // Toggle reference image display
  document.getElementById('showRefButton').onclick = function() {
    const refImage = document.getElementById('refImage');
    if (refImage.style.display === 'block') {
      refImage.style.display = 'none';
    } else {
      refImage.style.display = 'block';
    }
  }

  // Recreate the reference image
  document.getElementById('recreateButton').onclick = function() { drawReferenceTriangles(); }

  // Spectrum drawing
  document.getElementById('spectrumCheckbox').addEventListener('change', function() { g_spectrumDraw = this.checked; });

  document.getElementById('kaleidoscopeCheckbox').addEventListener('change', function() { g_kaleidoscopeMode = this.checked; });
  
  document.getElementById('replayButton').onclick = function() { replayDrawing(); };

  document.getElementById('saveButton').onclick = function() { saveCanvasImage(); };
}

/// ChatGPT helped me with the saving functionality
function saveCanvasImage() {
  const format = "image/png";

  const link = document.createElement("a");
  link.download = `drawing_${Date.now()}.png`;
  link.href = canvas.toDataURL(format);
  link.click();
}

/// ChatGPT helped me with this replay drawing function
function replayDrawing() {
  gl.clear(gl.COLOR_BUFFER_BIT);
  let sortedShapes = [...g_shapesList].sort((a, b) => a.timestamp - b.timestamp);

  let baseTime = sortedShapes[0]?.timestamp || performance.now();

  for (let i = 0; i < sortedShapes.length; i++) {
    let shape = sortedShapes[i];
    let elapsedTime = shape.timestamp - baseTime;
    setTimeout(() => {
      shape.render();
    }, elapsedTime);
  }
}

//#region Picture Drawing
function drawReferenceTriangles() {
  // Body
  gl.uniform4f(u_FragColor, 0.0, 0.0, 1.0, 0.5);
  drawTriangle([
    -0.1, 0.0,
    0.5, 0.0,
    0.2, 0.5
  ]);
  // Neck
  drawTriangle([
    0.35, 0.214286,
    0.35, 0.357143,
    0.5, 0.214286
  ]);
  // Head
  drawTriangle([
    0.4, 0.285714,
    0.7, 0.285714,
    0.4, 0.55
  ]);
  // Left bicep
  drawTriangle([
    0.1, 0.5,
    0.3, 0.5,
    0.2, 0.714286
  ]);
  // Left forearm
  drawTriangle([
    0.27, 0.63,
    0.14, 0.785714,
    0.4, 0.857143
  ]);
  gl.uniform4f(u_FragColor, 1.0, 1.0, 0.0, 1.0);
  // Left hand
  drawTriangle([
    0.4, 0.857143,
    0.35, 0.9642857,
    0.55, 0.8928571
  ]);
  // Right hand
  drawTriangle([
    0.4, -0.4642857,
    0.55, -0.535714,
    0.3, -0.642857
  ]);
  // Right foot
  drawTriangle([
    -0.6, -0.785714,
    -0.8, -0.857142857,
    -0.5, -0.857142857
  ]);
  // Left foot
  drawTriangle([
    -0.4, -0.857142857,
    -0.6, -0.98,
    -0.3, -0.98
  ]);
  gl.uniform4f(u_FragColor, 0.0, 0.0, 1.0, 0.5);
  // Right bicep
  drawTriangle([
    0.6, 0.0357143,
    0.6, -0.285714,
    0.45, -0.0357143
  ]);
  // Right forearm
  drawTriangle([
    0.5, -0.25,
    0.7, -0.285714,
    0.5, -0.5
  ]);
  // Lower abdomen
  drawTriangle([
    -0.1, 0.214286,
    -0.2, -0.107143,
    0, -0.107143
  ]);
  // Hip
  drawTriangle([
    -0.3, 0,
    -0.3, -0.142857,
    -0.1, -0.214286
  ]);
  // Right thigh
  drawTriangle([
    -0.3, 0,
    -0.3, -0.142857,
    -0.8, -0.428571
  ]);
  // Right calf
  drawTriangle([
    -0.7, -0.357143,
    -0.8, -0.428571,
    -0.6, -0.785714
  ]);
  // Left thigh
  drawTriangle([
    -0.3, -0.142857,
    -0.1, -0.214286,
    -0.7, -0.57142857
  ]);
  // Left calf
  drawTriangle([
    -0.5, -0.4285714,
    -0.7, -0.57142857,
    -0.4, -0.857142857
  ]);
  // brown
  gl.uniform4f(u_FragColor, 0.5, 0.25, 0.0, 1.0);
  // Arrow handle
  drawTriangle([
    -1, 1,
    -0.55, 0.55,
    -0.4, 0.6
  ]);
  // silver
  gl.uniform4f(u_FragColor, 0.75, 0.75, 0.75, 1.0);
  // Arrow head
  drawTriangle([
    -0.65, 0.5,
    -0.35, 0.7,
    -0.3, 0.45
  ]);
  // Red Chest Right Mark
  gl.uniform4f(u_FragColor, 1.0, 0.0, 0.0, 1.0);
  drawTriangle([
    0.15, 0.178571,
    0.25, 0.178571,
    0.25, 0.107143
  ]);
  // Red Chest Left Mark
  drawTriangle([
    0.15, 0.107143,
    0.15, 0.178571,
    0.25, 0.107143
  ]);
}

//#endregion

function main() {
  // Set up canvas and gl variables
  setupWebGL();
  //Set up GLSL shaders and connect variables to GLSL
  connectVariablesToGLSL();

  // Set up actions for HTML UI
  addActionsForHtmlUI();

  // Register function (event handler) to be called on a mouse press
  canvas.onmousedown = click;
  // canvas.onmousemove = click;
  canvas.onmousemove = function(ev) { if (ev.buttons == 1) click(ev); };

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear <canvas>
  //gl.clear(gl.COLOR_BUFFER_BIT);

  renderAllShapes(); // Draw the initial shapes
}

var g_shapesList = []; // The array for the position of a mouse press

function click(ev) {
  // Extract the event click and return it in WebGL coordinates
  let [x, y] = convertCoordinatesEventToGL(ev);

  /// ChatGPT helped me with this math
  let currentTime = performance.now();
  let velocity = 0;

  if (g_lastMousePos && g_lastMouseTime) {
    let dx = x - g_lastMousePos[0];
    let dy = y - g_lastMousePos[1];
    let dt = currentTime - g_lastMouseTime;
    let dist = Math.sqrt(dx * dx + dy * dy);
    velocity = dist / dt; // pixels/ms
  }

  g_lastMousePos = [x, y];
  g_lastMouseTime = currentTime;

  // Create and store a new point object
  let point;
  if (g_seletcedType == POINT) {
    point = new Point();
  }
  else if (g_seletcedType == TRIANGLE) {
    point = new Triangle();
  }
  else if (g_seletcedType == CIRCLE) {
    point = new Circle();
    point.segments = g_seletcedSegment;
  }

  point.position = [x, y];
  point.timestamp = performance.now();
  
  /// ChatGPT gave me some pointers with this portion 
  if (g_spectrumDraw && velocity > 0) {
    let speed = Math.min(velocity * 1000, 100);
    point.size = Math.max(5, Math.min(30, speed));

    let t = speed / 100;
    point.color = [
      t,
      0.2,
      1.0 - t,
      g_selectedAlpha
    ];
  }
  else {
    point.color = g_selectedColor.slice();
    point.size = g_selectedSize;
  }
  
  /// ChatGPT helped me with this kaleidoscope math/code
  if (g_kaleidoscopeMode) {
    for (let i = 0; i < g_kaleidoscopeSegments; i++) {
      const angle = (2 * Math.PI / g_kaleidoscopeSegments) * i;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      const xRotated = x * cosA - y * sinA;
      const yRotated = x * sinA + y * cosA;

      let clone = Object.create(Object.getPrototypeOf(point));
      Object.assign(clone, point);
      clone.timestamp = performance.now();
      clone.position = [xRotated, yRotated];
      g_shapesList.push(clone);
    }
  } 
  else {
    g_shapesList.push(point);
  }

  // Draw every shape that is supposed to be drawn
  renderAllShapes();
}

function convertCoordinatesEventToGL(ev) {
  var x = ev.clientX; // x coordinate of a mouse pointer
  var y = ev.clientY; // y coordinate of a mouse pointer
  var rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
  y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);

  return([x, y]);
}

function renderAllShapes() {
  var startTime = performance.now();
  
  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);

  //var len = g_points.length;
  // var len = g_shapesList.length;
  
  // for(var i = 0; i < len; i++) {
  //   g_shapesList[i].render();
  // }

  drawTriangle3D( [-1.0, 0.0, 0.0,  -0.5, -1.0, 0.0,  0.0, 0.0, 0.0] );

  var body = new Cube();
  body.color = [1.0, 0.0, 0.0, 1.0];
  body.render();

  var duration = performance.now() - startTime;
  sendTextToHTML("numdot: " + len + " ms: " + Math.floor(duration) + " fps: " + Math.floor(1000/duration), "numdot");
}

function sendTextToHTML(text, htmlID) {
  var htmlElm = document.getElementById(htmlID);
  if (!htmlElm) {
    console.log('Failed to get the storage location of ' + htmlID);
    return;
  }
  htmlElm.innerHTML = text;
}
