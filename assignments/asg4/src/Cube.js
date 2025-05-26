// ----- Cube.js -----
// chatgpt–enhanced Cube.js with integrated normals support

// vertex data: position (x,y,z) + UV (u,v)
const cubeVertsUV = new Float32Array([
  // front face
   0,0,0,  0,0,   0,1,0,  0,1,   1,1,0,  1,1,
   0,0,0,  0,0,   1,1,0,  1,1,   1,0,0,  1,0,
  // top face
   0,1,0,  0,0,   0,1,1,  0,1,   1,1,1,  1,1,
   0,1,0,  0,0,   1,1,1,  1,1,   1,1,0,  1,0,
  // right face
   1,0,0,  0,0,   1,1,0,  0,1,   1,1,1,  1,1,
   1,0,0,  0,0,   1,1,1,  1,1,   1,0,1,  1,0,
  // left face
   0,0,0,  0,0,   0,1,0,  0,1,   0,1,1,  1,1,
   0,0,0,  0,0,   0,1,1,  1,1,   0,0,1,  1,0,
  // back face
   0,0,1,  0,0,   1,0,1,  1,0,   1,1,1,  1,1,
   0,0,1,  0,0,   1,1,1,  1,1,   0,1,1,  0,1,
  // bottom face
   0,0,1,  0,0,   1,0,1,  1,0,   1,0,0,  1,1,
   0,0,1,  0,0,   1,0,0,  1,1,   0,0,0,  0,1
]);

// per-vertex normals (36 vertices × 3 components)
const cubeNormals = new Float32Array([
  // front (0,0,-1)
  0,0,-1, 0,0,-1, 0,0,-1,   0,0,-1, 0,0,-1, 0,0,-1,
  // top (0,1,0)
  0,1,0,  0,1,0,  0,1,0,    0,1,0,  0,1,0,  0,1,0,
  // right (1,0,0)
  1,0,0,  1,0,0,  1,0,0,    1,0,0,  1,0,0,  1,0,0,
  // left (-1,0,0)
  -1,0,0, -1,0,0, -1,0,0,  -1,0,0, -1,0,0, -1,0,0,
  // back (0,0,1)
  0,0,1,  0,0,1,  0,0,1,    0,0,1,  0,0,1,  0,0,1,
  // bottom (0,-1,0)
  0,-1,0, 0,-1,0, 0,-1,0,   0,-1,0, 0,-1,0, 0,-1,0
]);

// shared buffer handles
let cubeVBO = null;
let normalVBO = null;

class Cube {
  constructor() {
    if (!cubeVBO) Cube.initBuffers();
    this.color      = [1,1,1,1];
    this.matrix     = new Matrix4();
    this.textureNum = -1;
  }

  static initBuffers() {
    // positions + UV
    cubeVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVBO);
    gl.bufferData(gl.ARRAY_BUFFER, cubeVertsUV, gl.STATIC_DRAW);
    const FS = cubeVertsUV.BYTES_PER_ELEMENT;
    const stride = FS * 5;
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(a_Position);
    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, stride, FS*3);
    gl.enableVertexAttribArray(a_UV);
    // normals
    normalVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalVBO);
    gl.bufferData(gl.ARRAY_BUFFER, cubeNormals, gl.STATIC_DRAW);
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Normal);
  }

  static bindAttributes() {
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVBO);
    const FS = cubeVertsUV.BYTES_PER_ELEMENT;
    const stride = FS * 5;
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(a_Position);
    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, stride, FS*3);
    gl.enableVertexAttribArray(a_UV);
    gl.bindBuffer(gl.ARRAY_BUFFER, normalVBO);
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Normal);
  }

  render() {
    Cube.bindAttributes();
    gl.uniform1i(u_whichTexture, this.textureNum);
    gl.uniform4f(u_FragColor, ...this.color);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
    gl.drawArrays(gl.TRIANGLES, 0, 36);
  }
}
window.Cube = Cube;
