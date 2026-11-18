import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Activity, Radio } from 'lucide-react';

export default function Cyber3DVisualizer({ activeMode = 'sender', isTransferring = false, progress = 0 }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x09090b, 0.03);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 3, 16);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Grid Floor (clean, dark, low-contrast)
    const gridHelper = new THREE.GridHelper(30, 30, 0x27272a, 0x18181b);
    gridHelper.position.y = -3;
    scene.add(gridHelper);

    // Minimalist Optical Data Ring
    const ringGeo = new THREE.TorusGeometry(4.2, 0.04, 16, 90);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x71717a,
      wireframe: true,
      transparent: true,
      opacity: 0.35
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    scene.add(ringMesh);

    // Outer Thin Orbit
    const outerRingGeo = new THREE.RingGeometry(5.8, 5.86, 64);
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: 0xa1a1aa,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.2
    });
    const outerRingMesh = new THREE.Mesh(outerRingGeo, outerRingMat);
    outerRingMesh.rotation.x = Math.PI / 2;
    scene.add(outerRingMesh);

    // Stream Points (fine optical dust)
    const particleCount = 180;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 16;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const pMaterial = new THREE.PointsMaterial({
      size: 0.12,
      color: 0xd4d4d8,
      transparent: true,
      opacity: 0.45
    });

    const particleSystem = new THREE.Points(geometry, pMaterial);
    scene.add(particleSystem);

    // Central Core Wireframe Orb
    const coreGeo = new THREE.IcosahedronGeometry(1.6, 1);
    const coreMat = new THREE.MeshBasicMaterial({
      color: isTransferring ? 0x10b981 : 0xd4d4d8,
      wireframe: true,
      transparent: true,
      opacity: 0.4
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreMesh);

    // Subtle Parallax
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / container.clientWidth - 0.5) * 2;
      mouseY = ((e.clientY - rect.top) / container.clientHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animationFrameId;
    let startTime = performance.now();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = (performance.now() - startTime) / 1000;

      // Parallax
      camera.position.x += (mouseX * 2.5 - camera.position.x) * 0.04;
      camera.position.y += (-mouseY * 2.5 + 3 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);

      // Rotate elements
      const speedMultiplier = isTransferring ? 2.0 : 0.8;
      ringMesh.rotation.z = elapsedTime * 0.2 * speedMultiplier;
      ringMesh.rotation.x = Math.sin(elapsedTime * 0.15) * 0.25;
      outerRingMesh.rotation.z = -elapsedTime * 0.1 * speedMultiplier;

      coreMesh.rotation.y = elapsedTime * 0.35 * speedMultiplier;
      coreMesh.rotation.x = elapsedTime * 0.18;

      // Drift particles
      const posArray = particleSystem.geometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        if (isTransferring) {
          posArray[i * 3 + 2] += 0.08;
          if (posArray[i * 3 + 2] > 8) posArray[i * 3 + 2] = -8;
        } else {
          posArray[i * 3 + 1] += Math.sin(elapsedTime + i) * 0.003;
        }
      }
      particleSystem.geometry.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [activeMode, isTransferring]);

  return (
    <div className="relative w-full h-32 md:h-40 rounded-xl overflow-hidden minimal-panel mb-6">
      <div ref={mountRef} className="w-full h-full cursor-default" />
      <div className="absolute top-3 left-4 flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900/90 border border-zinc-800 text-[11px] font-mono text-zinc-300">
        <Radio className="w-3.5 h-3.5 text-zinc-400" />
        <span>OPTICAL STREAM TELEMETRY</span>
      </div>
      <div className="absolute bottom-3 right-4 flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900/90 border border-zinc-800 text-[11px] font-mono text-zinc-400">
        <span className={`w-1.5 h-1.5 rounded-full ${isTransferring ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
        <span>{isTransferring ? 'STREAMING ACTIVE' : 'SYSTEM READY'}</span>
      </div>
    </div>
  );
}
