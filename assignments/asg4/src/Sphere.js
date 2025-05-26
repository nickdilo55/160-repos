class Sphere {
  constructor(lat=32, lon=32, rad=1) {
    if (!Sphere._inited) Sphere.initBuffers(lat, lon, rad);
    this.color      = [1,1,1,1];
    this.matrix     = new Matrix4();
    this.textureNum = -2;
  }

  static initBuffers(lat, lon, rad) {
    Sphere._inited = true;
    const m = Sphere.makeSphereMesh(lat, lon, rad);
    Sphere.vertexCount = m.indices.length;
    // interleave pos+uv
    const data = new Float32Array(m.indices.length * 5);
    for (let i=0; i<m.indices.length; i++) {
      const idx = m.indices[i];
      data.set(m.positions.slice(idx*3,idx*3+3), i*5+0);
      data.set(m.uvs     .slice(idx*2,idx*2+2), i*5+3);
    }
    Sphere.posUvVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, Sphere.posUvVBO);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const FS = data.BYTES_PER_ELEMENT;
    const stride = FS*5;
    gl.vertexAttribPointer(a_Position,3,gl.FLOAT,false,stride,0);
    gl.enableVertexAttribArray(a_Position);
    gl.vertexAttribPointer(a_UV,      2,gl.FLOAT,false,stride,FS*3);
    gl.enableVertexAttribArray(a_UV);
    // normals
    const nData = new Float32Array(m.indices.length * 3);
    for (let i=0; i<m.indices.length; i++) {
      const idx = m.indices[i];
      nData.set(m.normals.slice(idx*3,idx*3+3), i*3);
    }
    Sphere.normalVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, Sphere.normalVBO);
    gl.bufferData(gl.ARRAY_BUFFER, nData, gl.STATIC_DRAW);
    gl.vertexAttribPointer(a_Normal,3,gl.FLOAT,false,0,0);
    gl.enableVertexAttribArray(a_Normal);
  }

  static bindAttributes() {
    gl.bindBuffer(gl.ARRAY_BUFFER, Sphere.posUvVBO);
    const FS = Float32Array.BYTES_PER_ELEMENT;
    const stride = FS*5;
    gl.vertexAttribPointer(a_Position,3,gl.FLOAT,false,stride,0);
    gl.enableVertexAttribArray(a_Position);
    gl.vertexAttribPointer(a_UV,      2,gl.FLOAT,false,stride,FS*3);
    gl.enableVertexAttribArray(a_UV);
    gl.bindBuffer(gl.ARRAY_BUFFER, Sphere.normalVBO);
    gl.vertexAttribPointer(a_Normal,3,gl.FLOAT,false,0,0);
    gl.enableVertexAttribArray(a_Normal);
  }

  static makeSphereMesh(lat,lon,rad) {
    const positions=[], normals=[], uvs=[], indices=[];
    for(let i=0;i<=lat;i++){
      const t=i*Math.PI/lat, st=Math.sin(t), ct=Math.cos(t);
      for(let j=0;j<=lon;j++){
        const p=j*2*Math.PI/lon, sp=Math.sin(p), cp=Math.cos(p);
        const x=cp*st, y=ct, z=sp*st;
        positions.push(rad*x,rad*y,rad*z);
        normals.push(x,y,z);
        uvs.push(j/lon,1-i/lat);
      }
    }
    for(let i=0;i<lat;i++){
      for(let j=0;j<lon;j++){
        const a=i*(lon+1)+j;
        const b=a+lon+1;
        indices.push(a,b,a+1, b,b+1,a+1);
      }
    }
    return {positions,normals,uvs,indices};
  }

  render() {
    Sphere.bindAttributes();
    gl.uniform1i(u_whichTexture, this.textureNum);
    gl.uniform4f(u_FragColor, ...this.color);
    gl.uniformMatrix4fv(u_ModelMatrix,false,this.matrix.elements);
    gl.drawArrays(gl.TRIANGLES,0,Sphere.vertexCount);
  }
}
window.Sphere = Sphere;
