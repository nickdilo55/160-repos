// chatgpt helped me to optimize (i went from 40 fps to 2500) 
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

// Will hold our VBO once initialized
let cubeVBO = null;

class Cube {
  constructor() {
    // Initialize the single shared VBO & attribute pointers on first use
    if (!cubeVBO) {
      Cube.initBuffers();
    }

    this.color      = [1.0, 1.0, 1.0, 1.0];
    this.matrix     = new Matrix4();
    this.textureNum = -1;
  }

  // Called once to upload vertex+UV data and bind attribute pointers
  static initBuffers() {
    cubeVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVBO);
    gl.bufferData(gl.ARRAY_BUFFER, cubeVertsUV, gl.STATIC_DRAW);

    const FSIZE = cubeVertsUV.BYTES_PER_ELEMENT;
    const stride = FSIZE * 5;  // 3 floats pos + 2 floats UV

    // a_Position: first 3 floats, offset 0
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(a_Position);

    // a_UV: next 2 floats, offset 3 * FSIZE
    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, stride, FSIZE * 3);
    gl.enableVertexAttribArray(a_UV);
  }

  render() {
    // Bind the shared VBO
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVBO);

    // Choose flat-color / UV / texture mode
    gl.uniform1i(u_whichTexture, this.textureNum);

    // Upload color & model matrix
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

    // Issue one draw call for all 36 vertices (12 triangles)
    gl.drawArrays(gl.TRIANGLES, 0, 36);
  }
}

// Expose globally, as in your world.js
window.Cube = Cube;
