// Nick Di Lorenzo
// ndiloren@ucsc.edu
// 
var VSHADER_SOURCE =
  "attribute vec4 a_Position;\n" +
  "uniform float u_PointSize;\n" +
  "void main(){\n" +
  "  gl_Position = a_Position;\n" +
  "  gl_PointSize = u_PointSize;\n" +
  "}\n";

var FSHADER_SOURCE =
  "precision mediump float;\n" +
  "uniform vec4 u_FragColor;\n" +
  "void main(){\n" +
  "  gl_FragColor = u_FragColor;\n" +
  "}\n";

let canvas, gl, a_Position, u_FragColor, u_PointSize;
let currentColor = [1, 1, 1, 1],
    currentSize = 20,
    currentCircleSegments = 40,
    currentShapeType = "point",
    randomColorMode = false;
let shapesList = [];

function getRandomColor() {
  return [Math.random(), Math.random(), Math.random(), 1];
}

function renderShape(shape) {
  if (shape.type === "point") {
    gl.vertexAttrib3f(a_Position, shape.x, shape.y, 0);
    gl.uniform1f(u_PointSize, shape.size);
    gl.uniform4f(u_FragColor, shape.color[0], shape.color[1], shape.color[2], shape.color[3]);
    gl.drawArrays(gl.POINTS, 0, 1);
  } else if (shape.type === "triangle") {
    let d = shape.size / 200;
    let vertices = [
      shape.x, shape.y + d,
      shape.x - d, shape.y - d,
      shape.x + d, shape.y - d
    ];
    let buffer = gl.createBuffer();
    if (!buffer) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);
    gl.uniform4f(u_FragColor, shape.color[0], shape.color[1], shape.color[2], shape.color[3]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disableVertexAttribArray(a_Position);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.deleteBuffer(buffer);
  } else if (shape.type === "circle") {
    let clipRadius = shape.size / 200;
    let vertices = [shape.x, shape.y];
    for (let i = 0; i <= shape.segments; i++) {
      let theta = (i * 2 * Math.PI) / shape.segments;
      vertices.push(shape.x + clipRadius * Math.cos(theta), shape.y + clipRadius * Math.sin(theta));
    }
    let buffer = gl.createBuffer();
    if (!buffer) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);
    gl.uniform4f(u_FragColor, shape.color[0], shape.color[1], shape.color[2], shape.color[3]);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, vertices.length / 2);
    gl.disableVertexAttribArray(a_Position);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.deleteBuffer(buffer);
  }
}

function setupWebGL() {
  canvas = document.getElementById("webgl160");
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
  if (!gl) {
    console.error("Failed to get WebGL context.");
  }
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.error("Failed to initialize shaders.");
    return;
  }
  a_Position = gl.getAttribLocation(gl.program, "a_Position");
  if (a_Position < 0) {
    console.error("Failed to get a_Position.");
    return;
  }
  u_FragColor = gl.getUniformLocation(gl.program, "u_FragColor");
  if (!u_FragColor) {
    console.error("Failed to get u_FragColor.");
    return;
  }
  u_PointSize = gl.getUniformLocation(gl.program, "u_PointSize");
  if (!u_PointSize) {
    console.error("Failed to get u_PointSize.");
    return;
  }
}

function setupUI() {
  const rSlider = document.getElementById("rSlider"),
    gSlider = document.getElementById("gSlider"),
    bSlider = document.getElementById("bSlider");

  const updateColor = () => {
    const r = parseInt(rSlider.value),
          g = parseInt(gSlider.value),
          b = parseInt(bSlider.value);
    document.getElementById("rValue").innerText = r;
    document.getElementById("gValue").innerText = g;
    document.getElementById("bValue").innerText = b;
    currentColor = [r / 255, g / 255, b / 255, 1];
  };
  rSlider.oninput = updateColor;
  gSlider.oninput = updateColor;
  bSlider.oninput = updateColor;
  updateColor();

  const sizeSlider = document.getElementById("sizeSlider");
  const updateSize = () => {
    currentSize = parseFloat(sizeSlider.value);
    document.getElementById("sizeValue").innerText = currentSize;
  };
  sizeSlider.oninput = updateSize;
  updateSize();

  const segmentsSlider = document.getElementById("segmentsSlider");
  const updateSegments = () => {
    currentCircleSegments = parseInt(segmentsSlider.value);
    document.getElementById("segmentsValue").innerText = currentCircleSegments;
  };
  segmentsSlider.oninput = updateSegments;
  updateSegments();

  const pointButton = document.getElementById("pointButton"),
        triangleButton = document.getElementById("triangleButton"),
        circleButton = document.getElementById("circleButton");
  pointButton.onclick = () => {
    currentShapeType = "point";
    pointButton.style.backgroundColor = "#ddd";
    triangleButton.style.backgroundColor = "";
    circleButton.style.backgroundColor = "";
  };
  triangleButton.onclick = () => {
    currentShapeType = "triangle";
    triangleButton.style.backgroundColor = "#ddd";
    pointButton.style.backgroundColor = "";
    circleButton.style.backgroundColor = "";
  };
  circleButton.onclick = () => {
    currentShapeType = "circle";
    circleButton.style.backgroundColor = "#ddd";
    pointButton.style.backgroundColor = "";
    triangleButton.style.backgroundColor = "";
  };
  pointButton.onclick();

  const randomColorButton = document.getElementById("randomColorButton");
  randomColorButton.onclick = () => {
    randomColorMode = !randomColorMode;
    randomColorButton.innerText = randomColorMode ? "Random Color: ON" : "Random Color: OFF";
    randomColorButton.style.backgroundColor = randomColorMode ? "#ddd" : "";
  };

  const clearButton = document.getElementById("clearButton");
  clearButton.onclick = () => {
    shapesList = [];
    renderAllShapes();
  };
}

function addShape(ev) {
  let x = ev.clientX, y = ev.clientY;
  const rect = ev.target.getBoundingClientRect();
  x = ((x - rect.left) - canvas.width / 2) / (canvas.width / 2);
  y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);
  let shapeColor = randomColorMode ? getRandomColor() : currentColor.slice();
  let shape = { type: currentShapeType, x, y, size: currentSize, color: shapeColor };
  if (currentShapeType === "circle") shape.segments = currentCircleSegments;
  shapesList.push(shape);
  renderAllShapes();
}

function handleMouseEvents() {
  canvas.onmousedown = addShape;
  canvas.onmousemove = (ev) => { if (ev.buttons === 1) addShape(ev); };
}

function renderAllShapes() {
  gl.clear(gl.COLOR_BUFFER_BIT);
  shapesList.forEach((shape) => renderShape(shape));
}

function main() {
  setupWebGL();
  connectVariablesToGLSL();
  setupUI();
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  handleMouseEvents();
}

window.onload = main;
