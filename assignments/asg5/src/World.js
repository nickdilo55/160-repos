import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { MTLLoader }     from "three/addons/loaders/MTLLoader.js";
import { OBJLoader }     from "three/addons/loaders/OBJLoader.js";

function frameArea(sizeToFitOnScreen, boxSize, boxCenter, camera) {
  const halfSize = sizeToFitOnScreen * 0.5;
  const halfFov  = THREE.MathUtils.degToRad(camera.fov * 0.5);
  const distance = halfSize / Math.tan(halfFov);

  const fullDir  = new THREE.Vector3().subVectors(camera.position, boxCenter).normalize();
  const horizDir = fullDir.clone().multiply(new THREE.Vector3(1, 0, 1)).normalize();

  camera.position.copy(horizDir.multiplyScalar(distance).add(boxCenter));
  camera.position.y = boxCenter.y + boxSize * 0.5;

  camera.near = boxSize / 100;
  camera.far  = boxSize * 100;
  camera.updateProjectionMatrix();
  camera.lookAt(boxCenter);
}

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

  params.metalness = (oldMat.metalness  !== undefined) ? oldMat.metalness  : 0.3;
  params.roughness = (oldMat.roughness !== undefined) ? oldMat.roughness : 0.7;

  node.material = new THREE.MeshStandardMaterial(params);
}

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
            root.traverse((node) => {
              if (node.isMesh) {
                node.castShadow    = true;
                node.receiveShadow = true;
                ensureStandardMaterial(node);
              }
            });

            if (scaleFactor !== 1) {
              root.scale.set(scaleFactor, scaleFactor, scaleFactor);
            }

            const boxFloor = new THREE.Box3().setFromObject(root);
            const boxMinY  = boxFloor.min.y;
            root.position.y -= boxMinY;

            root.position.x += xOffset;

            scene.add(root);

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
  const canvas   = document.querySelector("#c");
  const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;

  const scene = new THREE.Scene();
  {
    const loader = new THREE.TextureLoader();
    const skyTex = loader.load("sky.jpg");
    skyTex.mapping = THREE.EquirectangularReflectionMapping;
    skyTex.colorSpace = THREE.SRGBColorSpace;
    scene.background = skyTex;
  }

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 5, 10);

  {
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x111111, 0.8);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const overheadPoint = new THREE.PointLight(0xffeecc, 0.8, 50, 2);
    overheadPoint.position.set(0, 15, 0);
    overheadPoint.castShadow = false;
    scene.add(overheadPoint);

    const floorPoint = new THREE.PointLight(0xffeecc, 0.4, 30, 2);
    floorPoint.position.set(5, 5, 5);
    floorPoint.castShadow = true;
    scene.add(floorPoint);
  }

  let ground;
  {
    const planeSize = 20;
    const planeGeo  = new THREE.PlaneGeometry(planeSize, planeSize);

    const floorTex = new THREE.TextureLoader().load("floor.jpg");
    floorTex.colorSpace = THREE.SRGBColorSpace;

    floorTex.wrapS = THREE.RepeatWrapping;
    floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(4, 4);

    const planeMat  = new THREE.MeshStandardMaterial({
      map: floorTex,
      color: 0x444222,
      roughness: 0.8,
    });

    ground    = new THREE.Mesh(planeGeo, planeMat);
    ground.rotation.x    = -Math.PI / 2;
    ground.position.y    = 0;
    ground.receiveShadow = true;
    scene.add(ground);
  }

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1, 0);
  controls.update();

  const woodTexture = new THREE.TextureLoader().load("wood.jpg");
  woodTexture.colorSpace = THREE.SRGBColorSpace;
  const woodMaterial = new THREE.MeshStandardMaterial({ map: woodTexture });

  const scatteredMeshes = [];
  const stackableMeshes  = [];
  const forbiddenMinX = -2, forbiddenMaxX = 2;
  const forbiddenMinZ = -2, forbiddenMaxZ = 2;

  function getRandomPositionOutOfCouchZone() {
    let x, z;
    do {
      x = (Math.random() * 16) - 8;
      z = (Math.random() * 16) - 8;
    } while (x >= forbiddenMinX && x <= forbiddenMaxX && z >= forbiddenMinZ && z <= forbiddenMaxZ);
    return { x, z };
  }

  {
    const stackX = -5, stackZ = -4;
    const cubeSize = 0.5;
    for (let i = 0; i < 3; i++) {
      const geo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
      const mesh = new THREE.Mesh(geo, woodMaterial);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const y = (i + 0.5) * cubeSize;
      mesh.position.set(stackX, y, stackZ);
      scene.add(mesh);
      scatteredMeshes.push(mesh);
      stackableMeshes.push(mesh);
    }
  }

  for (let i = 0; i < 17; i++) {
    let geometry;
    if (i % 2 === 0) {
      geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    } else {
      geometry = new THREE.CylinderGeometry(0.25, 0.25, 0.5, 16);
    }

    const mesh = new THREE.Mesh(geometry, woodMaterial);
    mesh.castShadow    = true;
    mesh.receiveShadow = true;

    const { x, z } = getRandomPositionOutOfCouchZone();
    mesh.position.set(x, 0.25, z);

    scene.add(mesh);
    scatteredMeshes.push(mesh);
    stackableMeshes.push(mesh);
  }

  stackableMeshes.push(ground);

  const raycaster = new THREE.Raycaster();
  const mouse     = new THREE.Vector2();
  let draggingMesh = null;
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  const lampMeshes = [];
  let lampLight = null;

  const sofaResult = await loadTexturedOBJ({
    mtlUrl:      "sofa.mtl",
    objUrl:      "sofa.obj",
    xOffset:     0,
    scaleFactor: 1,
    scene
  });

  const tableResult = await loadTexturedOBJ({
    mtlUrl:      "table.mtl",
    objUrl:      "table.obj",
    xOffset:     3,
    scaleFactor: 2,
    scene
  });

  tableResult.root.traverse((node) => {
    if (node.isMesh) {
      stackableMeshes.push(node);
    }
  });

  const lampResult = await loadTexturedOBJ({
    mtlUrl:      "lamp.mtl",
    objUrl:      "lamp.obj",
    xOffset:     0,
    scaleFactor: 1,
    scene
  });

  {
    const tBox = tableResult.box;
    const tableTopY = tBox.max.y;

    const lBox = lampResult.box;
    const lampMinY = lBox.min.y;

    const extraLift = 0.005;
    lampResult.root.position.y += (tableTopY - lampMinY + extraLift);

    const tableCenter = tBox.getCenter(new THREE.Vector3());
    lampResult.root.position.x = tableCenter.x;
    lampResult.root.position.z = tableCenter.z;

    lampResult.root.traverse((node) => {
      if (node.isMesh) {
        lampMeshes.push(node);
      }
    });

    lampLight = new THREE.PointLight(0xffddaa, 1.2, 10, 2);
    lampLight.intensity = 0;

    const worldLampTopY = lBox.max.y + lampResult.root.position.y;
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

  {
    const sBox = sofaResult.box;
    const couchTopY = sBox.max.y;

    const couchLight = new THREE.PointLight(0xffffff, 1.5, 30, 2);
    couchLight.position.set(
      sBox.getCenter(new THREE.Vector3()).x,
      couchTopY + 5,
      sBox.getCenter(new THREE.Vector3()).z
    );
    couchLight.castShadow = true;
    couchLight.intensity = 5;
    scene.add(couchLight);
  }

  let moonMesh, moonLight;
  {
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

    moonLight = new THREE.PointLight(0xffffff, 0.4, 30, 2);
    moonLight.castShadow = false;

    scene.add(moonMesh);
    scene.add(moonLight);
  }

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

  window.addEventListener("resize", () => {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });

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

  window.addEventListener("keydown", (event) => {
    switch (event.key) {
      case "E":
      case "e":
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(stackableMeshes, true);
        if (hits.length > 0) {
          draggingMesh = hits[0].object;
          draggingMesh.position.y = 2;
        }
        break;

      case "F":
      case "f":
        if (!draggingMesh) break;

        const dropOrigin = new THREE.Vector3(
          draggingMesh.position.x,
          50,
          draggingMesh.position.z
        );
        const dropDir = new THREE.Vector3(0, -1, 0);
        raycaster.set(dropOrigin, dropDir);

        const hitsDown = raycaster.intersectObjects(
          stackableMeshes.filter(m => m !== draggingMesh),
          true
        );

        if (hitsDown.length > 0) {
          const surfaceY = hitsDown[0].point.y;
          draggingMesh.position.y = surfaceY + 0.25;
        } else {
          draggingMesh.position.y = 0.25;
        }

        draggingMesh = null;
        break;
    }
  });

  window.addEventListener("mousemove", (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    if (draggingMesh) {
      raycaster.setFromCamera(mouse, camera);
      const intersectPoint = new THREE.Vector3();
      raycaster.ray.intersectPlane(groundPlane, intersectPoint);
      draggingMesh.position.x = intersectPoint.x;
      draggingMesh.position.z = intersectPoint.z;
      draggingMesh.position.y = 2;
    }
  });

  function animate(time) {
    const t = time * 0.001;

    const orbitRadius = 8;
    const orbitHeight = 12;
    const angle = t * 0.15;

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
