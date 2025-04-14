// ColoredPoints.js
// Vertex shader program
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'void main() {\n' +
  '  gl_Position = a_Position;\n' +
  '  gl_PointSize = 10.0;\n' +
  '}\n';

// Fragment shader program
var FSHADER_SOURCE =
  'precision mediump float;\n' +
  'uniform vec4 u_FragColor;\n' +
  'void main() {\n' +
  '  gl_FragColor = u_FragColor;\n' +
  '}\n';

// Global arrays to hold the click coordinates and the colors for each point
var g_points = []; // Stores [x, y] for each click
var g_colors = []; // Stores color [r, g, b, a] for each point

var gl = null;
var canvas = null;
var a_Position = null;
var u_FragColor = null;

/**
 * setupWebGL(): Obtains the canvas and WebGL context, and initializes basic state.
 */
function setupWebGL() {
  canvas = document.getElementById('webgl160');
  gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get WebGL context');
    return;
  }
  // Set the clear color (black here)
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
}

/**
 * connectVariablesToGLSL(): Initializes the shader programs and connects the
 * JavaScript variables to the GLSL attributes/uniforms.
 */
function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to initialize shaders.');
    return;
  }
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get a_Position');
    return;
  }
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get u_FragColor');
    return;
  }
}

/**
 * renderAllShapes(): Clears the canvas and draws all the stored points.
 */
function renderAllShapes() {
  // Clear the canvas
  gl.clear(gl.COLOR_BUFFER_BIT);
  // Loop over each stored point and color, and draw it
  for (let i = 0; i < g_points.length; i++) {
    let xy = g_points[i];
    let rgba = g_colors[i];
    gl.vertexAttrib3f(a_Position, xy[0], xy[1], 0.0);  // Set the position
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);  // Set the color
    gl.drawArrays(gl.POINTS, 0, 1); // Draw a single point
  }
}

/**
 * handleClicks(): Processes a mouse click by converting the event's coordinates,
 * updating the points and colors arrays, and re-rendering the scene.
 */
function handleClicks(ev) {
  var x = ev.clientX;
  var y = ev.clientY;
  var rect = ev.target.getBoundingClientRect();

  // Convert to WebGL's clip space coordinate system
  x = ((x - rect.left) - canvas.width / 2) / (canvas.width / 2);
  y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);

  // Store the coordinates
  g_points.push([x, y]);

  // Determine color based on which quadrant the point lies in
  if (x >= 0.0 && y >= 0.0) {
    g_colors.push([1.0, 0.0, 0.0, 1.0]); // First quadrant: Red
  } else if (x < 0.0 && y < 0.0) {
    g_colors.push([0.0, 1.0, 0.0, 1.0]); // Third quadrant: Green
  } else {
    g_colors.push([1.0, 1.0, 1.0, 1.0]); // Other quadrants: White
  }

  // Re-render the scene with the new point added
  renderAllShapes();
}

/**
 * main(): Initializes the app by setting up WebGL, connecting the shader variables,
 * adding the event handler, and clearing the initial canvas.
 */
function main() {
  setupWebGL();
  connectVariablesToGLSL();
  // Set the event handler for mouse clicks
  canvas.onmousedown = handleClicks;
  // Initial canvas clear (might be redundant with setupWebGL)
  gl.clear(gl.COLOR_BUFFER_BIT);
}
