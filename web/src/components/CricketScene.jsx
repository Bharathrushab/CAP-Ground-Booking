import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { CanvasTexture, CatmullRomCurve3, DataTexture, Matrix4, RedFormat, RepeatWrapping, Object3D, SRGBColorSpace, Vector3 } from 'three';

const threadCurve = new CatmullRomCurve3([
  new Vector3(-0.048, -0.014, -0.006),
  new Vector3(-0.03, -0.018, 0.011),
  new Vector3(0, 0, 0.021),
  new Vector3(0.03, 0.018, 0.011),
  new Vector3(0.048, 0.014, -0.006),
]);

function Stitches() {
  const stitches = useRef();
  useLayoutEffect(() => {
    const transform = new Object3D();
    const tangent = new Vector3();
    const latitude = new Vector3();
    const normal = new Vector3();
    const basis = new Matrix4();
    let instance = 0;
    for (const offset of [-0.25, -0.16, -0.07, 0.07, 0.16, 0.25]) {
      for (let index = 0; index < 96; index++) {
        const angle = (index + (offset > 0 ? 0.35 : 0)) / 96 * Math.PI * 2;
        const radius = Math.sqrt(1.482 ** 2 - offset ** 2);
        transform.position.set(Math.cos(angle) * radius, offset, Math.sin(angle) * radius);
        normal.copy(transform.position).normalize();
        tangent.set(Math.sin(angle), 0, -Math.cos(angle));
        latitude.crossVectors(normal, tangent).normalize();
        basis.makeBasis(tangent, latitude, normal);
        transform.quaternion.setFromRotationMatrix(basis);
        transform.updateMatrix();
        stitches.current.setMatrixAt(instance++, transform.matrix);
      }
    }
    stitches.current.instanceMatrix.needsUpdate = true;
  }, []);
  return <instancedMesh ref={stitches} args={[null, null, 576]}>
    <tubeGeometry args={[threadCurve, 12, 0.011, 6, false]} />
    <meshStandardMaterial color="#e5dcc4" roughness={0.9} />
  </instancedMesh>;
}

function Ball() {
  const group = useRef();
  const visible = useRef(true);
  const [surface] = useState(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const context = canvas.getContext('2d');
    context.fillStyle = '#850d1d';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.translate(canvas.width * 0.18, canvas.height * 0.30);
    context.rotate(-Math.PI / 3);
    context.scale(0.65, 1);
    context.fillStyle = '#c4ac69';
    context.strokeStyle = '#c4ac69';
    context.globalAlpha = 0.85;
    context.lineWidth = 2.5;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = 'bold 25px Georgia';
    const arcText = (text, radius, center, direction) => {
      const widths = [...text].map((letter) => context.measureText(letter).width);
      let angle = center - direction * widths.reduce((sum, width) => sum + width, 0) / radius / 2;
      [...text].forEach((letter, index) => {
        const step = widths[index] / radius;
        angle += direction * step / 2;
        context.save();
        context.translate(Math.cos(angle) * radius, Math.sin(angle) * radius);
        context.rotate(angle + direction * Math.PI / 2);
        context.fillText(letter, 0, 0);
        context.restore();
        angle += direction * step / 2;
      });
    };
    arcText('CRICKET ASSOCIATION', 125, -Math.PI / 2, 1);
    arcText('OF PEORIA', 120, Math.PI / 2, -1);
    context.beginPath();
    context.moveTo(-70, -58);
    context.quadraticCurveTo(0, -76, 70, -58);
    context.lineTo(63, 24);
    context.quadraticCurveTo(45, 62, 0, 81);
    context.quadraticCurveTo(-45, 62, -63, 24);
    context.closePath();
    context.stroke();
    context.font = 'bold 59px Georgia';
    context.fillText('CAP', 0, -3);
    context.beginPath();
    context.moveTo(-30, 36);
    context.lineTo(30, 36);
    context.stroke();
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  });
  const [leather] = useState(() => {
    const pixels = new Uint8Array(256 * 256);
    let seed = 17;
    for (let index = 0; index < pixels.length; index++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      pixels[index] = 90 + seed % 120;
    }
    const texture = new DataTexture(pixels, 256, 256, RedFormat);
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.repeat.set(4, 2);
    texture.needsUpdate = true;
    return texture;
  });
  useEffect(() => () => { leather.dispose(); surface.dispose(); }, [leather, surface]);
  useEffect(() => {
    const change = () => { visible.current = !document.hidden; };
    document.addEventListener('visibilitychange', change);
    return () => document.removeEventListener('visibilitychange', change);
  }, []);
  useFrame((state, delta) => {
    if (!visible.current || !group.current) return;
    group.current.rotation.y += Math.min(delta, 0.05) * 0.13;
    group.current.rotation.z = -1.05 + state.pointer.x * 0.08;
  });
  return <group ref={group} position={[2.5, 0, 0]} rotation={[0.15, 0, -1.05]}>
    <mesh castShadow><sphereGeometry args={[1.48, 96, 96]} /><meshPhysicalMaterial map={surface} roughness={0.48} metalness={0} clearcoat={0.15} clearcoatRoughness={0.45} bumpMap={leather} bumpScale={0.025} /></mesh>
    <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.478, 0.012, 8, 192]} /><meshStandardMaterial color="#4b0c14" roughness={0.62} /></mesh>
    <Stitches />
  </group>;
}

export default function CricketScene() {
  return <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 2.2, 9], fov: 39 }} gl={{ antialias: true, alpha: true }} aria-label="Rotating stitched cricket ball" onCreated={({ gl }) => { gl.setClearColor('#173f31', 0); }}>
    <ambientLight intensity={0.7} />
    <directionalLight castShadow position={[-1, 6, 5]} intensity={3.2} shadow-mapSize={[1024, 1024]} />
    <directionalLight position={[6, 1, -2]} color="#ffe4ce" intensity={2} />
    <Ball />
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}><planeGeometry args={[40, 40]} /><shadowMaterial opacity={0.3} /></mesh>
  </Canvas>;
}