// World.js

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { MTLLoader }     from "three/addons/loaders/MTLLoader.js";
import { OBJLoader }     from "three/addons/loaders/OBJLoader.js";

function frameArea(sizeToFitOnScreen, boxSize, boxCenter, camera) {
  const halfSize = sizeToFitOnScreen * 0.5;
  const halfFov = THREE.MathUtils.degToRad(camera.fov * 0.5);
  const distance = halfSize / Math.tan(halfFov);

  // Direction from box center to current camera position
  const fullDir = new THREE.Vector3().subVectors(camera.position, boxCenter).normalize();
  // Project onto XZ so camera remains level
  const horizDir = fullDir.clone().multiply(new THREE.Vector3(1, 0, 1)).normalize();

  camera.position.copy(horizDir.multiplyScalar(distance).add(boxCenter));
  camera.position.y = boxCenter.y + boxSize * 0.5; // raise half‐height

  camera.near = boxSize / 100;
  camera.far = boxSize * 100;
  camera.updateProjectionMatrix();
  camera.lookAt(boxCenter);
}

function main() {
  // 1) Renderer & Scene
  const canvas = document.querySelector("#c");
  const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x444444);

  // 2) Camera
  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 5, 10);

  // 3) Lights
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
  hemiLight.position.set(0, 20, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(-5, 10, -5);
  dirLight.castShadow = true;
  dirLight.shadow.camera.left   = -10;
  dirLight.shadow.camera.right  =  10;
  dirLight.shadow.camera.top    =  10;
  dirLight.shadow.camera.bottom = -10;
  scene.add(dirLight);

  // 4) Ground plane
  const planeGeo = new THREE.PlaneGeometry(20, 20);
  const planeMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
  const ground = new THREE.Mesh(planeGeo, planeMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  scene.add(ground);

  // 5) OrbitControls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1, 0);
  controls.update();

  // 6) Load MTL (must be in the same folder)
  new MTLLoader().load(
    // Because sofa.mtl (and the three JPGs) are in src/, we simply do:
    "sofa.mtl",
    (mtl) => {
      mtl.preload();   // Tells Three.js to load FabricLeather…jpg, FabricLeather…_normal.jpg, etc.

      // 7) Now load the OBJ with those materials
      const objLoader = new OBJLoader();
      objLoader.setMaterials(mtl);
      objLoader.load(
        "sofa.obj",
        (root) => {
          // Enable shadows on each mesh
          root.traverse((node) => {
            if (node.isMesh) {
              node.castShadow = true;
              node.receiveShadow = true;
            }
          });

          // 8) Drop sofa so bottom sits at y=0
          const box = new THREE.Box3().setFromObject(root);
          const boxMinY = box.min.y;
          root.position.y -= boxMinY;

          scene.add(root);

          // 9) Frame the camera around the sofa
          const shiftedBox = new THREE.Box3().setFromObject(root);
          const boxSize   = shiftedBox.getSize(new THREE.Vector3()).length();
          const boxCenter = shiftedBox.getCenter(new THREE.Vector3());
          frameArea(boxSize * 1.2, boxSize, boxCenter, camera);

          controls.maxDistance = boxSize * 5;
          controls.target.copy(boxCenter);
          controls.update();
        },
        undefined,
        (err) => console.error("Error loading sofa.obj:", err)
      );
    },
    undefined,
    (err) => console.error("Error loading sofa.mtl:", err)
  );

  // 10) Handle window resize
  window.addEventListener("resize", () => {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });

  // 11) Animation loop
  function animate() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

main();
