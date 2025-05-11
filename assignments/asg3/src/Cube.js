// Cube.js
class Cube {
    constructor() {
      this.type = 'cube';
        this.color  = [1,1,1,1];
        this.matrix = new Matrix4();
    }

    render() {
      // send model matrix once
      gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

      // if you still want to modulate by u_FragColor for shading:
      // var rgba = this.color;
      // gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

      // — FRONT face (z=0) —
      // lower‐left triangle
      drawTriangle3DUV(
        [ 0,0,0,   1,0,0,   1,1,0 ],    // xyz
        [ 0,0,   1,0,   1,1 ]           // uv
      );
      // upper‐right triangle
      drawTriangle3DUV(
        [ 0,0,0,   1,1,0,   0,1,0 ],
        [ 0,0,   1,1,   0,1 ]
      );

      // — RIGHT face (x=1) —
      drawTriangle3DUV(
        [ 1,0,0,   1,0,1,   1,1,1 ],
        [ 0,0,   1,0,   1,1 ]
      );
      drawTriangle3DUV(
        [ 1,0,0,   1,1,1,   1,1,0 ],
        [ 0,0,   1,1,   0,1 ]
      );

      // — BACK face (z=1) —
      drawTriangle3DUV(
        [ 1,0,1,   0,0,1,   0,1,1 ],
        [ 0,0,   1,0,   1,1 ]
      );
      drawTriangle3DUV(
        [ 1,0,1,   0,1,1,   1,1,1 ],
        [ 0,0,   1,1,   0,1 ]
      );

      // — LEFT face (x=0) —
      drawTriangle3DUV(
        [ 0,0,1,   0,0,0,   0,1,0 ],
        [ 0,0,   1,0,   1,1 ]
      );
      drawTriangle3DUV(
        [ 0,0,1,   0,1,0,   0,1,1 ],
        [ 0,0,   1,1,   0,1 ]
      );

      // — TOP face (y=1) —
      drawTriangle3DUV(
        [ 0,1,0,   1,1,0,   1,1,1 ],
        [ 0,0,   1,0,   1,1 ]
      );
      drawTriangle3DUV(
        [ 0,1,0,   1,1,1,   0,1,1 ],
        [ 0,0,   1,1,   0,1 ]
      );

      // — BOTTOM face (y=0) —
      drawTriangle3DUV(
        [ 0,0,1,   1,0,1,   1,0,0 ],
        [ 0,0,   1,0,   1,1 ]
      );
      drawTriangle3DUV(
        [ 0,0,1,   1,0,0,   0,0,0 ],
        [ 0,0,   1,1,   0,1 ]
      );
    }
}
