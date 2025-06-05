// World.js

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { MTLLoader }     from "three/addons/loaders/MTLLoader.js";
import { OBJLoader }     from "three/addons/loaders/OBJLoader.js";

/**
 * Helper to frame a PerspectiveCamera around a bounding‐box.
 */
function frameArea(sizeToFitOnScreen, boxSize, boxCenter, camera) {
  const halfSize = sizeToFitOnScreen * 0.5;
  const halfFov  = THREE.MathUtils.degToRad(camera.fov * 0.5);
  const distance = halfSize / Math.tan(halfFov);

  // Direction from box center → current camera position
  const fullDir  = new THREE.Vector3().subVectors(camera.position, boxCenter).normalize();
  // Project onto XZ so camera remains level (no tilt)
  const horizDir = fullDir.clone().multiply(new THREE.Vector3(1, 0, 1)).normalize();

  camera.position.copy(horizDir.multiplyScalar(distance).add(boxCenter));
  camera.position.y = boxCenter.y + boxSize * 0.5; // raise to half‐height

  camera.near = boxSize / 100;
  camera.far  = boxSize * 100;
  camera.updateProjectionMatrix();
  camera.lookAt(boxCenter);
}

/**
 * Convert any imported MeshPhongMaterial → MeshStandardMaterial so that
 * bump/roughness/etc. channels actually work.
 */
function ensureStandardMaterial(node) {
  if (!node.isMesh) return;
  const oldMat = node.material;
  if (oldMat && oldMat.isMeshStandardMaterial) return;

  const params = {};
  if (oldMat.color)        params.color       = oldMat.color.clone();
  if (oldMat.map)          params.map         = oldMat.map;
  if (oldMat.normalMap)    params.normalMap   = oldMat.normalMap;
  if (oldMat.roughnessMap) params.roughnessMap = oldMat.roughnessMap;
  if (oldMat.specularMap)  params.roughnessMap = oldMat.specularMap;
  if (oldMat.aoMap)        params.aoMap       = oldMat.aoMap;
  if (oldMat.metalnessMap) params.metalnessMap = oldMat.metalnessMap;

  // If MTL didn’t set explicit metalness/roughness, give defaults
  params.metalness = (oldMat.metalness  !== undefined) ? oldMat.metalness  : 0.3;
  params.roughness = (oldMat.roughness !== undefined) ? oldMat.roughness : 0.7;

  node.material = new THREE.MeshStandardMaterial(params);
}

/**
 * Loads one OBJ + MTL, drops it on the floor (so its minY → 0), optionally
 * scales it, shifts it in X by xOffset, then adds to `scene`. Returns a
 * Promise<{ root, box }> where `root` is the loaded Object3D and `box` is its
 * world‐space bounding‐box (after dropping + scaling + shifting).
 */
function loadTexturedOBJ({ mtlUrl, objUrl, xOffset = 0, scaleFactor = 1, scene }) {
  return new Promise((resolve, reject) => {
    new MTLLoader().load(
      mtlUrl,
      (mtl) => {
        mtl.preload();

        const objLoader = new OBJLoader();
        objLoader.setMaterials(mtl);
        objLoader.load(
          objUrl,
          (root) => {
            // 1) Convert any MeshPhongMaterial → MeshStandardMaterial + enable shadows
            root.traverse((node) => {
              if (node.isMesh) {
                node.castShadow    = true;
                node.receiveShadow = true;
                ensureStandardMaterial(node);
              }
            });

            // 2) Scale uniformly if requested
            if (scaleFactor !== 1) {
              root.scale.set(scaleFactor, scaleFactor, scaleFactor);
            }

            // 3) Drop on the floor so the model’s minY sits at world‐Y = 0
            const boxFloor = new THREE.Box3().setFromObject(root);
            const boxMinY  = boxFloor.min.y;
            root.position.y -= boxMinY;

            // 4) Shift in X by xOffset
            root.position.x += xOffset;

            // 5) Add to scene now
            scene.add(root);

            // 6) Compute final, world‐space bounding box
            root.updateMatrixWorld(true);
            const finalBox = new THREE.Box3().setFromObject(root);
            resolve({ root, box: finalBox });
          },
          undefined,
          (err) => {
            console.error(`Error loading ${objUrl}:`, err);
            reject(err);
          }
        );
      },
      undefined,
      (err) => {
        console.error(`Error loading ${mtlUrl}:`, err);
        reject(err);
      }
    );
  });
}

async function main() {
  // 1) Renderer & Scene
  const canvas   = document.querySelector("#c");
  const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;

  // 2) Scene + skybox (equirectangular background) using sky.png
  const scene = new THREE.Scene();
  {
    const loader = new THREE.TextureLoader();
    const skyTex = loader.load("sky.jpg");
    // Tell three.js it’s an equirectangular panorama:
    skyTex.mapping = THREE.EquirectangularReflectionMapping;
    skyTex.colorSpace = THREE.SRGBColorSpace;
    scene.background = skyTex;
  }

  // 3) Camera (Perspective)
  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 5, 10);

  // 4) Lights (Hemisphere, intense overhead Point, couch PointLight)
  {
    // 4A) Hemisphere: brighten a bit to see skybox stars
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x111111, 0.8);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    // 4B) Subtle overhead PointLight → more intense
    const overheadPoint = new THREE.PointLight(0xffeecc, 0.8, 50, 2);
    overheadPoint.position.set(0, 15, 0);
    overheadPoint.castShadow = false;
    scene.add(overheadPoint);

    // 4C) Floor-scraping PointLight (low-level fill so cubes aren’t pitch black)
    const floorPoint = new THREE.PointLight(0xffeecc, 0.4, 30, 2);
    floorPoint.position.set(5, 5, 5);
    floorPoint.castShadow = true;
    scene.add(floorPoint);
  }

  // 5) Ground plane (receives shadows) → now using floor.jpg texture, darker
  let ground; // store global for raycasting
  {
    const planeSize = 20;
    const planeGeo  = new THREE.PlaneGeometry(planeSize, planeSize);

    // Load floor.jpg as a texture:
    const floorTex = new THREE.TextureLoader().load("floor.jpg");
    floorTex.colorSpace = THREE.SRGBColorSpace;

    // Repeat the texture so it’s not too stretched:
    floorTex.wrapS = THREE.RepeatWrapping;
    floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(4, 4);

    // Multiply by a dark color to dim it further
    const planeMat  = new THREE.MeshStandardMaterial({
      map: floorTex,
      color: 0x444222,       // darker brown tint
      roughness: 0.8,
    });

    ground    = new THREE.Mesh(planeGeo, planeMat);
    ground.rotation.x    = -Math.PI / 2;
    ground.position.y    = 0;
    ground.receiveShadow = true;
    scene.add(ground);
  }

  // 6) OrbitControls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1, 0);
  controls.update();

  // 7) Textured primary shapes (cubes + cylinders), all half-size,
  //    none collide with the couch, and one stack of three cubes.

  // Load the wood texture once and reuse:
  const woodTexture = new THREE.TextureLoader().load("wood.jpg");
  woodTexture.colorSpace = THREE.SRGBColorSpace;
  const woodMaterial = new THREE.MeshStandardMaterial({ map: woodTexture });

  // We will scatter 17 shapes randomly, and then build 1 stack of 3 cubes.
  // Cube half-size: 0.5 units on each side → geometry = BoxGeometry(0.5, 0.5, 0.5)
  // Cylinder half-size: radius 0.25, height 0.5 → geometry = CylinderGeometry(0.25, 0.25, 0.5)
  // We avoid the region x∈[–2,2], z∈[–2,2] so none touch the couch.

  const scatteredMeshes = [];
  const stackableMeshes  = []; // everything we can stack on (wood shapes + table + ground)
  const forbiddenMinX = -2, forbiddenMaxX = 2;
  const forbiddenMinZ = -2, forbiddenMaxZ = 2;

  function getRandomPositionOutOfCouchZone() {
    let x, z;
    do {
      x = (Math.random() * 16) - 8; // uniform in [–8, +8]
      z = (Math.random() * 16) - 8; // uniform in [–8, +8]
    } while (x >= forbiddenMinX && x <= forbiddenMaxX && z >= forbiddenMinZ && z <= forbiddenMaxZ);
    return { x, z };
  }

  // 7A) Stack of three cubes at one fixed location (e.g., x = -5, z = -4)
  {
    const stackX = -5, stackZ = -4;
    const cubeSize = 0.5;
    for (let i = 0; i < 3; i++) {
      const geo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
      const mesh = new THREE.Mesh(geo, woodMaterial);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Place them on top of each other: Y = (i + 0.5) * 0.5
      const y = (i + 0.5) * cubeSize;
      mesh.position.set(stackX, y, stackZ);
      scene.add(mesh);
      scatteredMeshes.push(mesh);
      stackableMeshes.push(mesh);
    }
  }

  // 7B) Scatter 17 remaining shapes randomly (only cubes or cylinders)
  for (let i = 0; i < 17; i++) {
    let geometry;
    if (i % 2 === 0) {
      // even → cube (size = 0.5)
      geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    } else {
      // odd → cylinder (radiusTop=radiusBottom=0.25, height=0.5)
      geometry = new THREE.CylinderGeometry(0.25, 0.25, 0.5, 16);
    }

    const mesh = new THREE.Mesh(geometry, woodMaterial);
    mesh.castShadow    = true;
    mesh.receiveShadow = true;

    // Get a random x,z outside the forbidden zone
    const { x, z } = getRandomPositionOutOfCouchZone();
    // Y = half the height (0.25) so it sits on the floor
    mesh.position.set(x, 0.25, z);

    scene.add(mesh);
    scatteredMeshes.push(mesh);
    stackableMeshes.push(mesh);
  }

  // Include the ground plane for stacking:
  stackableMeshes.push(ground);

  // 8) Prepare raycaster & mouse for lamp click and for dragging objects
  const raycaster = new THREE.Raycaster();
  const mouse     = new THREE.Vector2();
  let draggingMesh = null;
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  const lampMeshes = [];
  let lampLight = null;

  // 9) Load sofa, table, lamp in sequence
  // ─────────────────────────────────────────────────────────────────────────────
  // 9A) Sofa @ x=0, scale=1
  const sofaResult = await loadTexturedOBJ({
    mtlUrl:      "sofa.mtl",
    objUrl:      "sofa.obj",
    xOffset:     0,
    scaleFactor: 1,
    scene
  });

  // 9B) Table @ x=3, scale=2
  const tableResult = await loadTexturedOBJ({
    mtlUrl:      "table.mtl",
    objUrl:      "table.obj",
    xOffset:     3,
    scaleFactor: 2,
    scene
  });

  // After loading the table, add its meshes to stackableMeshes so cubes can stack on it:
  tableResult.root.traverse((node) => {
    if (node.isMesh) {
      stackableMeshes.push(node);
    }
  });

  // 9C) Lamp: drop on floor first, then “lift” onto table top
  const lampResult = await loadTexturedOBJ({
    mtlUrl:      "lamp.mtl",
    objUrl:      "lamp.obj",
    xOffset:     0,
    scaleFactor: 1,
    scene
  });

  // 10) Re-position lamp so it sits on table’s top, at table’s center (XZ)
  {
    // Table’s bounding box in world-space:
    const tBox = tableResult.box;
    const tableTopY = tBox.max.y;

    // Lamp’s bounding box (currently sitting on floor at Y=0):
    const lBox = lampResult.box;
    const lampMinY = lBox.min.y;

    // 10A) Move lamp up so its minY → tableTopY + a tiny offset
    const extraLift = 0.005;
    lampResult.root.position.y += (tableTopY - lampMinY + extraLift);

    // 10B) Center lamp X,Z on table’s center X,Z:
    const tableCenter = tBox.getCenter(new THREE.Vector3());
    lampResult.root.position.x = tableCenter.x;
    lampResult.root.position.z = tableCenter.z;

    // 10C) Collect all Meshes under the lamp so we can raycast them
    lampResult.root.traverse((node) => {
      if (node.isMesh) {
        lampMeshes.push(node);
      }
    });

    // 10D) Create the lamp’s PointLight (initially OFF)
    lampLight = new THREE.PointLight(0xffddaa, 1.2, 10, 2);
    lampLight.intensity = 0; // OFF by default

    // Compute the absolute top of the lamp’s geometry:
    const worldLampTopY = lBox.max.y + lampResult.root.position.y;
    // Push it down a tiny bit so it sits just inside the shade:
    const smallOffset = 0.05;
    lampLight.position.set(
      lampResult.root.position.x,
      worldLampTopY - smallOffset,
      lampResult.root.position.z
    );

    lampLight.castShadow = true;
    lampLight.intensity = 5;
    scene.add(lampLight);
  }

  // 11) Add a PointLight above the couch so it shines downward (more intense now)
  {
    // We know sofaResult.box gives us the couch’s world‐space box
    const sBox = sofaResult.box;
    const couchTopY = sBox.max.y;

    // Place a PointLight a few units above the couch’s top
    const couchLight = new THREE.PointLight(0xffffff, 1.5, 30, 2);
    couchLight.position.set(
      sBox.getCenter(new THREE.Vector3()).x,   // center X
      couchTopY + 5,                            // 5 units above couch
      sBox.getCenter(new THREE.Vector3()).z    // center Z
    );
    couchLight.castShadow = true;
    couchLight.intensity = 5;
    scene.add(couchLight);
  }

  // 12) Create the “moon” (larger white sphere with emissive material + PointLight)
  let moonMesh, moonLight;
  {
    // 12A) Geometry & material for the moon (radius = 1.0)
    const moonRadius = 1.0;
    const moonGeo = new THREE.SphereGeometry(moonRadius, 32, 32);
    const moonMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xaaaaaa,
      emissiveIntensity: 0.8,
      roughness: 0.3,
      metalness: 0.5,
    });
    moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonMesh.castShadow = false;
    moonMesh.receiveShadow = false;

    // 12B) Attach a subtle PointLight to the moon so it actually “emits” light
    moonLight = new THREE.PointLight(0xffffff, 0.4, 30, 2);
    moonLight.castShadow = false;

    // Add both to the scene now; position will be updated in animate()
    scene.add(moonMesh);
    scene.add(moonLight);
  }

  // 13) Frame the camera around everything (sofa + table + lamp + 20 shapes + moon)
  const combinedBox = new THREE.Box3();
  combinedBox.union(sofaResult.box);
  combinedBox.union(tableResult.box);
  combinedBox.union(lampResult.box);

  scatteredMeshes.forEach((m) => {
    const tempBox = new THREE.Box3().setFromObject(m);
    combinedBox.union(tempBox);
  });

  const combinedSize   = combinedBox.getSize(new THREE.Vector3()).length();
  const combinedCenter = combinedBox.getCenter(new THREE.Vector3());
  frameArea(combinedSize * 1.2, combinedSize, combinedCenter, camera);

  controls.maxDistance = combinedSize * 5;
  controls.target.copy(combinedCenter);
  controls.update();

  // 14) Handle window resize
  window.addEventListener("resize", () => {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });

  // 15) Handle clicks: toggle lampLight on/off if lamp was clicked
  window.addEventListener("click", (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersectsLamp = raycaster.intersectObjects(lampMeshes, true);
    if (intersectsLamp.length > 0 && lampLight) {
      lampLight.intensity = (lampLight.intensity > 0) ? 0 : 1.2;
    }
  });

  // 16) Handle "E" to pick up a shape, "F" to drop it, and mousemove for dragging
  window.addEventListener("keydown", (event) => {
    switch (event.key) {
      case "E":
      case "e":
        // Attempt to pick up a stackable mesh under the mouse
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(stackableMeshes, true);
        if (hits.length > 0) {
          draggingMesh = hits[0].object;
          // Raise it to a fixed hover height so we can drag it
          draggingMesh.position.y = 2;
        }
        break;

      case "F":
      case "f":
        if (!draggingMesh) break;

        // Cast a ray straight down from y=50 at the mesh’s current X,Z
        const dropOrigin = new THREE.Vector3(
          draggingMesh.position.x,
          50, // high above everything
          draggingMesh.position.z
        );
        const dropDir = new THREE.Vector3(0, -1, 0);
        raycaster.set(dropOrigin, dropDir);

        // Intersect against all stackable meshes (floor, cubes, cylinders, etc.)
        // but filter out the draggingMesh itself
        const hitsDown = raycaster.intersectObjects(
          stackableMeshes.filter(m => m !== draggingMesh),
          true
        );

        if (hitsDown.length > 0) {
          // Place so bottom of shape sits on top of whichever surface we hit
          const surfaceY = hitsDown[0].point.y;
          // half‐height = 0.25
          draggingMesh.position.y = surfaceY + 0.25;
        } else {
          // No hit → drop to floor (y=0.25)
          draggingMesh.position.y = 0.25;
        }

        draggingMesh = null;
        break;
    }
  });

  window.addEventListener("mousemove", (event) => {
    // Update normalized mouse coordinates
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    if (draggingMesh) {
      // Project mouse ray onto the ground plane (y=0)
      raycaster.setFromCamera(mouse, camera);
      const intersectPoint = new THREE.Vector3();
      raycaster.ray.intersectPlane(groundPlane, intersectPoint);
      // Move the dragging mesh to that XZ, keep its Y at 2 while dragging
      draggingMesh.position.x = intersectPoint.x;
      draggingMesh.position.z = intersectPoint.z;
      draggingMesh.position.y = 2;
    }
  });

  // 17) Animation loop: update the moon’s orbit + render
  function animate(time) {
    // time is in milliseconds; convert to seconds:
    const t = time * 0.001;

    // 17A) Moon orbit: radius = 8, height = 12, center at (0,0)
    const orbitRadius = 8;
    const orbitHeight = 12;
    const angle = t * 0.15; // slower speed = 0.15 rad/sec

    const moonX = orbitRadius * Math.cos(angle);
    const moonZ = orbitRadius * Math.sin(angle);
    moonMesh.position.set(moonX, orbitHeight, moonZ);
    moonLight.position.set(moonX, orbitHeight, moonZ);

    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

main();
