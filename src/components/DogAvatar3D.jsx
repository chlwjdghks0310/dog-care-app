import { useEffect, useRef } from "react";
import * as THREE from "three";
import { getBreedAppearance } from "../data/breedAppearance";

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
    const { root, headGroup, mouth, tail } = buildDog(appearance);
    root.rotation.y = -0.5;
    scene.add(root);

    let frameId;
    const clock = new THREE.Clock();

    function animate() {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const current = stateRef.current;

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
