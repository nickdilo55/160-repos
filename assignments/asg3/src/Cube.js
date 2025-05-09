// Cube.js
class Cube {
    constructor() {
        this.color  = [1,1,1,1];
        this.matrix = new Matrix4();
    }

    render() {
        // 1) Send the current model matrix to the shader
        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
        // 2) Send the color
        gl.uniform4f(u_FragColor,
            this.color[0],
            this.color[1],
            this.color[2],
            this.color[3]
        );

        // Now draw each face (two triangles per face)

        // — FRONT (z = 0) —
        drawTriangle3D([ 0,0,0,  1,0,0,  1,1,0 ]);
        drawTriangle3D([ 0,0,0,  1,1,0,  0,1,0 ]);

        // — RIGHT (x = 1) —
        drawTriangle3D([ 1,0,0,  1,0,1,  1,1,1 ]);
        drawTriangle3D([ 1,0,0,  1,1,1,  1,1,0 ]);

        // — BACK (z = 1) —
        drawTriangle3D([ 1,0,1,  0,0,1,  0,1,1 ]);
        drawTriangle3D([ 1,0,1,  0,1,1,  1,1,1 ]);

        // — LEFT (x = 0) —
        drawTriangle3D([ 0,0,1,  0,0,0,  0,1,0 ]);
        drawTriangle3D([ 0,0,1,  0,1,0,  0,1,1 ]);

        // — TOP (y = 1) —
        drawTriangle3D([ 0,1,0,  1,1,0,  1,1,1 ]);
        drawTriangle3D([ 0,1,0,  1,1,1,  0,1,1 ]);

        // — BOTTOM (y = 0) —
        drawTriangle3D([ 0,0,1,  1,0,1,  1,0,0 ]);
        drawTriangle3D([ 0,0,1,  1,0,0,  0,0,0 ]);
    }
}
