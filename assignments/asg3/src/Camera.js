class Camera {
  constructor(canvas, fov = 60, near = 0.1, far = 1000) {
    this.canvas     = canvas;
    this.fov        = fov;
    this.near       = near;
    this.far        = far;
    // Keep a world-space transform for the camera
    this.transform = new Matrix4().setIdentity();
    // Projection matrix
    this.projectionMatrix = new Matrix4().setPerspective(
       this.fov,
       this.canvas.width / this.canvas.height,
       this.near,
       this.far
     );
    // View matrix (will be the inverse of transform)
    this.viewMatrix = new Matrix4().setIdentity();
    this.updateViewMatrix();
  }

  // Invert the world transform to get the view matrix
  updateViewMatrix() {
    this.viewMatrix.set(this.transform).invert();
  }

  // If canvas resized, update projection
  resize() {
    // Recompute with the *same* fov/near/far you started with:
    this.projectionMatrix.setPerspective(
      this.fov,
      this.canvas.width / this.canvas.height,
      this.near,
      this.far
    );
  }

  // Move along local -Z (forward)
  moveForward(dist) {
    this.transform.translate(0, 0, -dist);
    this.updateViewMatrix();
  }

  // Move along local +Z (backwards)
  moveBackwards(dist) {
    this.transform.translate(0, 0, dist);
    this.updateViewMatrix();
  }

  // Move along local -X (left)
  moveLeft(dist) {
    this.transform.translate(-dist, 0, 0);
    this.updateViewMatrix();
  }

  // Move along local +X (right)
  moveRight(dist) {
    this.transform.translate(dist, 0, 0);
    this.updateViewMatrix();
  }

  // Yaw (around world Y) and pitch (around local X)
  pan(yawDeg, pitchDeg) {
    this.transform
      .rotate(yawDeg, 0, 1, 0)
      .rotate(pitchDeg, 1, 0, 0);
    this.updateViewMatrix();
  }
}

window.Camera = Camera;
