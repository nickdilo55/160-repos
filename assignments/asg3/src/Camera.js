class Camera {
  constructor(canvas, fov = 60, near = 0.1, far = 1000) {
    this.canvas     = canvas;
    this.fov        = fov;
    this.near       = near;
    this.far        = far;
    this.transform = new Matrix4().setIdentity();
    this.projectionMatrix = new Matrix4().setPerspective(
       this.fov,
       this.canvas.width / this.canvas.height,
       this.near,
       this.far
     );
    this.viewMatrix = new Matrix4().setIdentity();
    this.updateViewMatrix();
  }

  updateViewMatrix() {
    this.viewMatrix.set(this.transform).invert();
  }

  resize() {
    this.projectionMatrix.setPerspective(
      this.fov,
      this.canvas.width / this.canvas.height,
      this.near,
      this.far
    );
  }

  moveForward(dist) {
    this.transform.translate(0, 0, -dist);
    this.updateViewMatrix();
  }

  moveBackwards(dist) {
    this.transform.translate(0, 0, dist);
    this.updateViewMatrix();
  }

  moveLeft(dist) {
    this.transform.translate(-dist, 0, 0);
    this.updateViewMatrix();
  }

  moveRight(dist) {
    this.transform.translate(dist, 0, 0);
    this.updateViewMatrix();
  }

  pan(yawDeg, pitchDeg) {
    this.transform
      .rotate(yawDeg, 0, 1, 0)
      .rotate(pitchDeg, 1, 0, 0);
    this.updateViewMatrix();
  }
}

window.Camera = Camera;
