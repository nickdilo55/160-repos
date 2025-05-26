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
   0,0,1,  0,0,   1,0,0,  1,1,   0,0,0,  0,1,
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
  0,-1,0, 0,-1,0, 0,-1,0,   0,-1,0, 0,-1,0, 0,-1,0,
]);

// shared buffer handles
let cubeVBO = null;
let normalVBO = null;

class Cube {
  constructor() {
    // one-time initialization of both VBOs and attribute pointers
    if (!cubeVBO) {
      Cube.initBuffers();
    }

    this.color      = [1.0, 1.0, 1.0, 1.0];
    this.matrix     = new Matrix4();
    this.textureNum = -1;
  }

  static initBuffers() {
    // 1) upload positions + UVs
    cubeVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVBO);
    gl.bufferData(gl.ARRAY_BUFFER, cubeVertsUV, gl.STATIC_DRAW);

    const FSIZE  = cubeVertsUV.BYTES_PER_ELEMENT;
    const stride = FSIZE * 5; // 3 floats pos + 2 floats UV

    // a_Position: loc=3 floats@ offset 0
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(a_Position);

    // a_UV: loc=2 floats@ offset 3*FSIZE
    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, stride, FSIZE * 3);
    gl.enableVertexAttribArray(a_UV);

    // 2) upload normals
    normalVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalVBO);
    gl.bufferData(gl.ARRAY_BUFFER, cubeNormals, gl.STATIC_DRAW);

    // a_Normal: 3 floats per vertex, tightly packed
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Normal);
  }

  render() {
    // re-bind the position+UV buffer (normals pointer stays bound to normalVBO)
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVBO);

    // tell the shader which mode (flat, UV, texture or normals)
    gl.uniform1i(u_whichTexture, this.textureNum);

    // upload color & model transform
    gl.uniform4f(
      u_FragColor,
      this.color[0], this.color[1],
      this.color[2], this.color[3]
    );
    gl.uniformMatrix4fv(
      u_ModelMatrix,
      false,
      this.matrix.elements
    );

    // draw all 36 verts
    gl.drawArrays(gl.TRIANGLES, 0, 36);
  }
}

// expose
window.Cube = Cube;
