import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { getBreedAppearance } from "../data/breedAppearance";

// 커스텀 캐릭터 모델 경로. 이 파일이 없으면(404) 조용히 절차적(견종 프리셋) 아바타로만 보여준다.
const CUSTOM_MODEL_URL = "/dog-model.glb";

// ⚠️ 하이브리드 보정값: 모델은 뼈대/관절이 없어서, 꼬리·입은 우리가 직접 만든
// 단순 도형을 모델 위에 겹쳐서 애니메이션한다. 실제로 화면에 띄워보고 조정해야 한다.
const HYBRID_TUNING = {
  targetHeight: 1.7,
  tailOffset: { x: 0, y: 0.55, z: -0.85 },
  mouthOffset: { x: 0, y: 0.35, z: 0.85 },
};

function buildDog(appearance) {
  const { color, size, earStyle, fluffy, curlyTail, snoutLength, shortLegs, longBody, patchColor } = appearance;
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
  const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x2b2320, roughness: 0.6 });

  const root = new THREE.Group();

  // 몸통
  const bodyGeo = new THREE.SphereGeometry(1, 20, 16);
  const body = new THREE.Mesh(bodyGeo, material);
  body.scale.set(longBody ? 1.35 : 1, 0.85, 0.95);
  body.position.set(0, shortLegs ? 0.75 : 0.95, 0);
  root.add(body);

  if (patchColor) {
    const patch = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), new THREE.MeshStandardMaterial({ color: patchColor }));
    patch.position.set(0, body.position.y - 0.15, 0.85);
    patch.scale.set(0.8, 1, 0.5);
    root.add(patch);
  }

  // 다리
  const legHeight = shortLegs ? 0.5 : 0.9;
  const legGeo = new THREE.CylinderGeometry(0.16, 0.16, legHeight, 10);
  const legOffsets = [
    [0.55, -0.45],
    [-0.55, -0.45],
    [0.55, 0.45],
    [-0.55, 0.45],
  ];
  for (const [x, z] of legOffsets) {
    const leg = new THREE.Mesh(legGeo, material);
    leg.position.set(x * (longBody ? 1.2 : 1), legHeight / 2, z);
    root.add(leg);
  }

  // 머리 그룹 (통째로 끄덕임 애니메이션에 사용)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, body.position.y + 0.75, longBody ? 0.95 : 0.75);
  root.add(headGroup);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 20, 16), material);
  headGroup.add(head);

  const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, snoutLength, 12), material);
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, -0.08, 0.35 + snoutLength / 2);
  headGroup.add(snout);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), darkMaterial);
  nose.position.set(0, -0.08, 0.35 + snoutLength);
  headGroup.add(nose);

  // 입 (talking 애니메이션 대상)
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.05), darkMaterial);
  mouth.position.set(0, -0.22, 0.32 + snoutLength * 0.6);
  headGroup.add(mouth);

  // 눈
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), darkMaterial);
    eye.position.set(side * 0.22, 0.08, 0.45);
    headGroup.add(eye);
  }

  // 귀
  const earColor = material;
  for (const side of [-1, 1]) {
    let ear;
    if (earStyle === "pointy") {
      ear = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 10), earColor);
      ear.position.set(side * 0.38, 0.5, 0.05);
      ear.rotation.z = side * 0.25;
    } else {
      ear = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), earColor);
      ear.scale.set(0.5, 1, 0.8);
      ear.position.set(side * 0.48, 0.15, 0.1);
      ear.rotation.z = side * -0.3;
    }
    headGroup.add(ear);
  }

  // 꼬리
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.6, 10), material);
  tail.position.set(0, body.position.y + (curlyTail ? 0.55 : 0.15), (longBody ? -1.1 : -0.85));
  tail.rotation.x = curlyTail ? Math.PI * 0.85 : Math.PI * 0.6;
  root.add(tail);

  // 복슬복슬한 견종용 뭉실뭉실 장식
  if (fluffy) {
    const puffGeo = new THREE.SphereGeometry(0.22, 10, 8);
    const puffCount = 16;
    for (let i = 0; i < puffCount; i++) {
      const puff = new THREE.Mesh(puffGeo, material);
      const theta = (i / puffCount) * Math.PI * 2;
      const phi = 0.4 + (i % 3) * 0.3;
      const r = 1.05;
      puff.position.set(
        r * Math.sin(phi) * Math.cos(theta) * 0.9,
        body.position.y + Math.cos(phi) * 0.7,
        r * Math.sin(phi) * Math.sin(theta) * 0.9
      );
      const s = 0.6 + Math.random() * 0.3;
      puff.scale.set(s, s, s);
      root.add(puff);
    }
  }

  root.scale.setScalar(size);
  return { root, headGroup, mouth, tail };
}

// 커스텀 GLB(뼈대 없는 정적 메쉬) + 우리가 만든 단순 꼬리/입을 합친 "하이브리드" 아바타.
// 모양/색은 불러온 모델을 쓰고, 애니메이션이 필요한 부분만 절차적으로 덧붙인다.
function buildHybridDog(gltfScene) {
  const root = new THREE.Group();

  const box = new THREE.Box3().setFromObject(gltfScene);
  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);

  const scale = HYBRID_TUNING.targetHeight / Math.max(size.y, 0.001);
  gltfScene.position.sub(center);
  gltfScene.scale.setScalar(scale);
  root.add(gltfScene);

  const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x2b2320, roughness: 0.6 });
  const tailMaterial = new THREE.MeshStandardMaterial({ color: 0xcaa06a, roughness: 0.85 });

  const headGroup = new THREE.Group();
  headGroup.position.set(
    HYBRID_TUNING.mouthOffset.x,
    HYBRID_TUNING.mouthOffset.y,
    HYBRID_TUNING.mouthOffset.z
  );
  root.add(headGroup);

  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.04), darkMaterial);
  headGroup.add(mouth);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.45, 10), tailMaterial);
  tail.position.set(HYBRID_TUNING.tailOffset.x, HYBRID_TUNING.tailOffset.y, HYBRID_TUNING.tailOffset.z);
  tail.rotation.x = Math.PI * 0.6;
  root.add(tail);

  return { root, headGroup, mouth, tail };
}

export default function DogAvatar3D({ breed, state = "idle", photoColor = null, height = 200 }) {
  const mountRef = useRef(null);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 280;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera.position.set(0, 1.5, 4.4);
    camera.lookAt(0, 0.9, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x554433, 1.1));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(2.5, 3, 2);
    scene.add(dirLight);

    const appearance = { ...getBreedAppearance(breed), ...(photoColor != null ? { color: photoColor } : {}) };
    let parts = buildDog(appearance);
    parts.root.rotation.y = -0.5;
    scene.add(parts.root);

    // 커스텀 모델(GLB)이 있으면 불러와서 절차적 아바타를 교체한다.
    // 로딩 중이거나 파일이 없으면(404 등) 절차적 아바타를 그대로 보여준다.
    let cancelled = false;
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load(
      CUSTOM_MODEL_URL,
      (gltf) => {
        if (cancelled) return;
        scene.remove(parts.root);
        parts = buildHybridDog(gltf.scene);
        parts.root.rotation.y = -0.5;
        scene.add(parts.root);
      },
      undefined,
      () => {
        // 모델 파일이 없거나 로드 실패 — 절차적 아바타 유지, 별도 에러 처리 불필요.
      }
    );

    let frameId;
    const clock = new THREE.Clock();

    function animate() {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const current = stateRef.current;
      const { headGroup, mouth, tail } = parts;

      const idleBob = Math.sin(t * 1.6) * 0.03;
      headGroup.position.y = headGroup.userData.baseY ?? (headGroup.userData.baseY = headGroup.position.y);
      headGroup.position.y = headGroup.userData.baseY + idleBob;
      tail.rotation.z = Math.sin(t * (current === "thinking" ? 2.2 : 3.2)) * 0.35;

      if (current === "thinking") {
        headGroup.rotation.z = Math.sin(t * 2) * 0.12;
        mouth.scale.y = 1;
      } else if (current === "talking") {
        headGroup.rotation.z = Math.sin(t * 4) * 0.04;
        mouth.scale.y = 1 + Math.abs(Math.sin(t * 14)) * 2.4;
      } else {
        headGroup.rotation.z *= 0.9;
        mouth.scale.y += (1 - mouth.scale.y) * 0.2;
      }

      renderer.render(scene, camera);
    }
    animate();

    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth || width;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    });
    resizeObserver.observe(container);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [breed, photoColor, height]);

  return <div ref={mountRef} style={{ width: "100%", height }} />;
}
