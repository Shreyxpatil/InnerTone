import React, { useRef, useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame, useGraph } from '@react-three/fiber';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';

// Oculus viseme morph targets in ReadyPlayerMe models
const VISEME_NAMES = [
    'viseme_aa', 'viseme_E', 'viseme_I', 'viseme_O', 'viseme_U',
    'viseme_FF', 'viseme_TH', 'viseme_PP', 'viseme_SS', 'viseme_CH',
    'viseme_DD', 'viseme_kk', 'viseme_nn', 'viseme_RR', 'viseme_sil'
];

export function Avatar3D({ aiState }) {
    const { scene: originalScene } = useGLTF('/models/avatar.glb');

    // R3F Official way to clone skinned meshes to prevent HMR accumulation
    const scene = useMemo(() => SkeletonUtils.clone(originalScene), [originalScene]);
    const { nodes } = useGraph(scene);

    const headMeshRef = useRef(null);
    const bonesRef = useRef({});
    const defaultQuats = useRef({});

    // Animation state refs
    const visemeState = useRef({ targetViseme: 0, nextChangeTime: 0 });
    const headState = useRef({ yaw: 0, pitch: 0, targetYaw: 0, targetPitch: 0, nextChangeTime: 0 });

    useEffect(() => {
        const bones = {};
        const quats = {};

        // Use the cloned nodes directly instead of traversing the whole scene
        // to guarantee we are mutating the unique instance, not the GLTF cache.
        Object.values(nodes).forEach((child) => {
            if (child.isMesh && child.morphTargetDictionary && !headMeshRef.current) {
                headMeshRef.current = child;
            }
            if (child.isBone) {
                const name = child.name;
                if (['LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm',
                    'LeftHand', 'RightHand', 'Head', 'Neck',
                    'LeftShoulder', 'RightShoulder',
                    'Spine', 'Spine1', 'Spine2'].includes(name)) {
                    bones[name] = child;
                    quats[name] = child.quaternion.clone();
                }
            }
        });

        bonesRef.current = bones;
        defaultQuats.current = quats;
    }, [nodes]);

    // Debug UI state
    const [, forceRender] = React.useState(0);

    useFrame((state) => {
        const head = headMeshRef.current;
        const bones = bonesRef.current;
        const time = state.clock.elapsedTime;

        // Apply folded arms pose every frame based on debug values
        if (bones.LeftArm) {
            applyFoldedArmsPose(bones, defaultQuats.current);
        }

        // ============================
        // 1. NATURAL EYE BLINKING
        // ============================
        if (head?.morphTargetDictionary) {
            const blinkCycle = Math.sin(time * 2.5 + Math.sin(time * 0.7) * 2);
            const isBlinking = blinkCycle > 0.97;
            const targetBlink = isBlinking ? 1 : 0;
            const blinkL = head.morphTargetDictionary['eyeBlinkLeft'];
            const blinkR = head.morphTargetDictionary['eyeBlinkRight'];
            if (blinkL !== undefined) head.morphTargetInfluences[blinkL] += (targetBlink - head.morphTargetInfluences[blinkL]) * 0.35;
            if (blinkR !== undefined) head.morphTargetInfluences[blinkR] += (targetBlink - head.morphTargetInfluences[blinkR]) * 0.35;
        }

        // ============================
        // 2. MULTI-VISEME LIP SYNC
        // ============================
        if (head?.morphTargetDictionary && aiState === 'speaking') {
            const vs = visemeState.current;
            if (time > vs.nextChangeTime) {
                vs.targetViseme = Math.floor(Math.random() * (VISEME_NAMES.length - 1));
                vs.nextChangeTime = time + 0.07 + Math.random() * 0.06;
            }
            for (let i = 0; i < VISEME_NAMES.length; i++) {
                const idx = head.morphTargetDictionary[VISEME_NAMES[i]];
                if (idx !== undefined) {
                    const target = (i === vs.targetViseme) ? (0.4 + Math.random() * 0.4) : 0;
                    head.morphTargetInfluences[idx] += (target - head.morphTargetInfluences[idx]) * 0.3;
                }
            }
            // jaw
            const jawIdx = head.morphTargetDictionary['jawOpen'];
            if (jawIdx !== undefined) {
                head.morphTargetInfluences[jawIdx] += ((0.1 + Math.abs(Math.sin(time * 12)) * 0.25) - head.morphTargetInfluences[jawIdx]) * 0.3;
            }
        }

        // ============================
        // 3. HEAD MICRO-MOVEMENTS
        // ============================
        if (bones.Head && defaultQuats.current['Head']) {
            const hs = headState.current;
            if (aiState === 'speaking') {
                if (time > hs.nextChangeTime) {
                    hs.targetYaw = (Math.random() - 0.5) * 0.1;
                    hs.targetPitch = (Math.random() - 0.5) * 0.05;
                    hs.nextChangeTime = time + 0.5 + Math.random() * 1.5;
                }
            } else if (aiState === 'listening') {
                hs.targetPitch = Math.sin(time * 1.5) * 0.04;
                hs.targetYaw = Math.sin(time * 0.8) * 0.02;
            } else {
                hs.targetYaw = Math.sin(time * 0.5) * 0.015;
                hs.targetPitch = Math.sin(time * 0.3) * 0.01;
            }
            hs.yaw += (hs.targetYaw - hs.yaw) * 0.05;
            hs.pitch += (hs.targetPitch - hs.pitch) * 0.05;

            const headExtra = new THREE.Quaternion().setFromEuler(new THREE.Euler(hs.pitch, hs.yaw, 0));
            bones.Head.quaternion.copy(defaultQuats.current['Head']).premultiply(headExtra);
        }

        // ============================
        // 4. SUBTLE BREATHING
        // ============================
        if (bones.Spine2) {
            const breathScale = 1 + Math.sin(time * 1.8) * 0.003;
            bones.Spine2.scale.set(breathScale, breathScale, breathScale);
        }
    });

    return (
        <group dispose={null} position={[0, -1.7, 0]}>
            <primitive object={scene} scale={1.2} />
        </group>
    );
}

function applyFoldedArmsPose(bones, defaultQuats) {
    // Exact values tuned by user via debug UI
    const d = {
        uaDown: 1,
        uaForward: 0.2,
        faBendX: 0,
        faBendY: 0.3,
        faBendZ: 1.5,
        faCrossX: -0.,
        faCrossY: 0.5,
        faCrossZ: 0
    };

    // LEFT ARM
    if (bones.LeftArm && defaultQuats['LeftArm']) {
        const q = defaultQuats['LeftArm'].clone();
        const down = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), d.uaDown);
        const forward = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), d.uaForward);
        q.premultiply(down).premultiply(forward);
        bones.LeftArm.quaternion.copy(q);
    }

    // RIGHT ARM
    if (bones.RightArm && defaultQuats['RightArm']) {
        const q = defaultQuats['RightArm'].clone();
        const down = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -d.uaDown);
        const forward = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), d.uaForward);
        q.premultiply(down).premultiply(forward);
        bones.RightArm.quaternion.copy(q);
    }

    // LEFT FOREARM
    if (bones.LeftForeArm && defaultQuats['LeftForeArm']) {
        const q = defaultQuats['LeftForeArm'].clone();
        const bx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), d.faBendX);
        const by = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), d.faBendY);
        const bz = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), d.faBendZ);
        const cx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), d.faCrossX);
        const cy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), d.faCrossY);
        const cz = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), d.faCrossZ);
        q.multiply(bx).multiply(by).multiply(bz).multiply(cx).multiply(cy).multiply(cz);
        bones.LeftForeArm.quaternion.copy(q);
    }

    // RIGHT FOREARM
    if (bones.RightForeArm && defaultQuats['RightForeArm']) {
        const q = defaultQuats['RightForeArm'].clone();
        const bx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -d.faBendX);
        const by = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -d.faBendY);
        const bz = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -d.faBendZ);
        const cx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -d.faCrossX);
        const cy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -d.faCrossY);
        const cz = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -d.faCrossZ);
        q.multiply(bx).multiply(by).multiply(bz).multiply(cx).multiply(cy).multiply(cz);
        bones.RightForeArm.quaternion.copy(q);
    }
}

useGLTF.preload('/models/avatar.glb');


