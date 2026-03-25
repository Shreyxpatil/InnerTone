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

// ─────────────────────────────────────────────────
// GESTURE LIBRARY
// Each gesture defines target bone rotations as
// { boneName: [x, y, z] Euler offsets from default }
// ─────────────────────────────────────────────────
const GESTURES = {
    // Relaxed folded-arms idle
    idle: {
        duration: [3, 5],
        bones: {
            LeftArm:      { axis: new THREE.Vector3(0, 0, 1), angle:  1.0 },
            RightArm:     { axis: new THREE.Vector3(0, 0, 1), angle: -1.0 },
            LeftForeArm:  [
                { axis: new THREE.Vector3(0, 0, 1), angle:  1.5 },
                { axis: new THREE.Vector3(0, 1, 0), angle:  0.5 },
            ],
            RightForeArm: [
                { axis: new THREE.Vector3(0, 0, 1), angle: -1.5 },
                { axis: new THREE.Vector3(0, 1, 0), angle: -0.5 },
            ],
            LeftHand:     { axis: new THREE.Vector3(0, 1, 0), angle:  0.0 },
            RightHand:    { axis: new THREE.Vector3(0, 1, 0), angle:  0.0 },
        }
    },

    // Custom idle for Male proportions (wider shoulders, thicker chest)
    idle_male: {
        duration: [3, 5],
        bones: {
            LeftShoulder: { axis: new THREE.Vector3(0, 0, 1), angle: -0.1 },
            RightShoulder:{ axis: new THREE.Vector3(0, 0, 1), angle:  0.1 },
            LeftArm:  [
                { axis: new THREE.Vector3(0, 0, 1), angle:  0.90 }, // 0.8 + 0.10
                { axis: new THREE.Vector3(1, 0, 0), angle:  1.50 },
            ],
            RightArm: [
                { axis: new THREE.Vector3(0, 0, 1), angle: -0.80 }, // -0.8 + 0.00
                { axis: new THREE.Vector3(1, 0, 0), angle:  1.40 },
            ],
            LeftForeArm:  [
                { axis: new THREE.Vector3(0, 0, 1), angle:  1.25 }, // 1.6 - 0.35
                { axis: new THREE.Vector3(0, 1, 0), angle:  0.85 }, // 0.2 + 0.65
            ],
            RightForeArm: [
                { axis: new THREE.Vector3(0, 0, 1), angle: -1.60 }, // -1.6 + 0.00
                { axis: new THREE.Vector3(0, 1, 0), angle: -1.60 }, // -0.2 - 1.40
            ],
            LeftHand:     { axis: new THREE.Vector3(0, 1, 0), angle:  0.1 },
            RightHand:    { axis: new THREE.Vector3(0, 1, 0), angle: -0.1 },
        }
    },

    // Raise one hand — like making a point
    raise_hand: {
        duration: [2.5, 4],
        bones: {
            LeftArm:      { axis: new THREE.Vector3(0, 0, 1), angle:  0.3 },
            RightArm:     { axis: new THREE.Vector3(1, 0, 0), angle: -0.9 },
            LeftForeArm:  [
                { axis: new THREE.Vector3(0, 0, 1), angle:  1.5 },
                { axis: new THREE.Vector3(0, 1, 0), angle:  0.4 },
            ],
            RightForeArm: [
                { axis: new THREE.Vector3(0, 0, 1), angle: -0.3 },
                { axis: new THREE.Vector3(1, 0, 0), angle: -0.8 },
            ],
            LeftHand:     { axis: new THREE.Vector3(0, 1, 0), angle:  0.1 },
            RightHand:    { axis: new THREE.Vector3(0, 0, 1), angle: -0.2 }, // slight palm-out
        }
    },

    // Open arms — welcoming, empathetic
    open_arms: {
        duration: [3, 5],
        bones: {
            LeftArm:      { axis: new THREE.Vector3(0, 0, 1), angle:  0.5 },
            RightArm:     { axis: new THREE.Vector3(0, 0, 1), angle: -0.5 },
            LeftForeArm:  [
                { axis: new THREE.Vector3(0, 0, 1), angle:  0.5 },
                { axis: new THREE.Vector3(1, 0, 0), angle:  0.3 },
            ],
            RightForeArm: [
                { axis: new THREE.Vector3(0, 0, 1), angle: -0.5 },
                { axis: new THREE.Vector3(1, 0, 0), angle:  0.3 },
            ],
            LeftHand:     { axis: new THREE.Vector3(0, 0, 1), angle:  0.3 }, // palms up / open
            RightHand:    { axis: new THREE.Vector3(0, 0, 1), angle: -0.3 },
        }
    },

    // Thinking — forearm raised, hand near chin
    thinking: {
        duration: [3, 5.5],
        bones: {
            LeftArm:      { axis: new THREE.Vector3(0, 0, 1), angle:  1.0 },
            RightArm:     { axis: new THREE.Vector3(1, 0, 0), angle: -0.5 },
            LeftForeArm:  [
                { axis: new THREE.Vector3(0, 0, 1), angle:  1.5 },
                { axis: new THREE.Vector3(0, 1, 0), angle:  0.5 },
            ],
            RightForeArm: [
                { axis: new THREE.Vector3(0, 0, 1), angle: -1.0 },
                { axis: new THREE.Vector3(1, 0, 0), angle: -1.1 },
            ],
            LeftHand:     { axis: new THREE.Vector3(0, 1, 0), angle:  0.0 },
            RightHand:    { axis: new THREE.Vector3(1, 0, 0), angle: -0.4 }, // hand curls slightly
        }
    },

    // Shrug — shoulders + palms up
    shrug: {
        duration: [1.5, 2.5],
        bones: {
            LeftArm:      { axis: new THREE.Vector3(1, 0, 0), angle:  0.4 },
            RightArm:     { axis: new THREE.Vector3(1, 0, 0), angle:  0.4 },
            LeftForeArm:  [
                { axis: new THREE.Vector3(0, 0, 1), angle:  0.7 },
                { axis: new THREE.Vector3(1, 0, 0), angle:  0.2 },
            ],
            RightForeArm: [
                { axis: new THREE.Vector3(0, 0, 1), angle: -0.7 },
                { axis: new THREE.Vector3(1, 0, 0), angle:  0.2 },
            ],
            LeftHand:     { axis: new THREE.Vector3(0, 0, 1), angle:  0.5 }, // palms up
            RightHand:    { axis: new THREE.Vector3(0, 0, 1), angle: -0.5 },
        }
    },

    // Gentle emphasis — small forearm lift, restrained
    emphasis: {
        duration: [2, 3.5],
        bones: {
            LeftArm:      { axis: new THREE.Vector3(0, 0, 1), angle:  0.8 },
            RightArm:     { axis: new THREE.Vector3(1, 0, 0), angle: -0.4 },
            LeftForeArm:  [
                { axis: new THREE.Vector3(0, 0, 1), angle:  1.3 },
                { axis: new THREE.Vector3(0, 1, 0), angle:  0.3 },
            ],
            RightForeArm: [
                { axis: new THREE.Vector3(0, 0, 1), angle: -0.6 },
                { axis: new THREE.Vector3(1, 0, 0), angle: -0.5 },
            ],
            LeftHand:     { axis: new THREE.Vector3(0, 1, 0), angle:  0.1 },
            RightHand:    { axis: new THREE.Vector3(1, 0, 0), angle: -0.2 },
        }
    },
};

const SPEAKING_GESTURES = ['raise_hand', 'open_arms', 'thinking', 'shrug', 'emphasis'];

// Build a quaternion from an array of {axis, angle} rotations composed together
function buildGestureQuat(basedOnDefault, rotations) {
    const q = basedOnDefault.clone();
    const rots = Array.isArray(rotations) ? rotations : [rotations];
    rots.forEach(({ axis, angle }) => {
        const rq = new THREE.Quaternion().setFromAxisAngle(axis, angle);
        q.premultiply(rq);
    });
    return q;
}

// Avaturn (male) has a different base skeleton than RPM (female).
// We define base correction offsets that are applied on top of the default pose.
const BASE_CORRECTIONS = {
    female: {}, // RPM is our baseline, no correction needed
    male: {
        Head: { axis: new THREE.Vector3(0.3, 0, 0), angle: -0.80 }, // Tilt head up more robustly
    }
};

// ─────────────────────────────────────────────────

export function Avatar3D({ aiState, gender = 'female' }) {
    const modelPath = gender === 'male' ? '/models/male.glb' : '/models/female.glb';
    const { scene: originalScene } = useGLTF(modelPath);

    const scene = useMemo(() => SkeletonUtils.clone(originalScene), [originalScene]);
    const { nodes } = useGraph(scene);

    const headMeshesRef = useRef([]);
    const bonesRef = useRef({});
    const defaultQuats = useRef({});

    // Lip-sync state
    const visemeState = useRef({ targetViseme: 0, nextChangeTime: 0 });
    // Head movement state
    const headState = useRef({ yaw: 0, pitch: 0, targetYaw: 0, targetPitch: 0, nextChangeTime: 0 });
    // Current interpolated bone quats (for smooth lerp between gestures)
    const currentQuats = useRef({});
    // Gesture sequencer state
    const gestureState = useRef({
        name: 'idle',
        targetQuats: {},
        nextChangeTime: 0,
    });

    useEffect(() => {
        const bones = {};
        const quats = {};
        const headMeshes = [];

        Object.values(nodes).forEach((child) => {
            if (child.isMesh && child.morphTargetDictionary) {
                console.log(`[Avatar3D] Found mesh with morph targets: ${child.name}`, Object.keys(child.morphTargetDictionary));
                headMeshes.push(child);
            }
            if (child.isBone) {
                const name = child.name;
                if (['LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm',
                    'LeftHand', 'RightHand', 'Head', 'Neck',
                    'LeftShoulder', 'RightShoulder',
                    'Spine', 'Spine1', 'Spine2'].includes(name) || name.toLowerCase().includes('jaw') || name.toLowerCase().includes('lip')) {
                    if (name.toLowerCase().includes('jaw') || name.toLowerCase().includes('lip')) console.log('[Avatar3D] Found mouth bone:', name);
                    bones[name] = child;
                    quats[name] = child.quaternion.clone();
                }
            }
        });

        headMeshesRef.current = headMeshes;
        bonesRef.current = bones;
        defaultQuats.current = quats;

        // Apply base skeleton correction based on gender
        const correction = BASE_CORRECTIONS[gender];
        Object.keys(quats).forEach(boneName => {
            if (correction[boneName] && quats[boneName]) {
                const corrQ = new THREE.Quaternion().setFromAxisAngle(correction[boneName].axis, correction[boneName].angle);
                quats[boneName].premultiply(corrQ);
            }
        });

        // Seed current quats with idle defaults based on the *corrected* defaults
        const baseIdleName = gender === 'male' ? 'idle_male' : 'idle';
        const idleGesture = GESTURES[baseIdleName];
        const initQuats = {};
        Object.entries(idleGesture.bones).forEach(([boneName, rotations]) => {
            const def = quats[boneName];
            if (def) {
                initQuats[boneName] = buildGestureQuat(def, rotations);
            }
        });
        currentQuats.current = initQuats;
        gestureState.current.targetQuats = initQuats;
        gestureState.current.name = baseIdleName;
    }, [nodes, gender]);

    useFrame((state) => {
        const headMeshes = headMeshesRef.current;
        const bones = bonesRef.current;
        const defs = defaultQuats.current;
        const time = state.clock.elapsedTime;

        const isTtsSpeaking = window.speechSynthesis && window.speechSynthesis.speaking;
        const isSpeaking = aiState === 'speaking' || isTtsSpeaking;

        // ============================
        // 1. GESTURE SEQUENCER
        // ============================
        const gs = gestureState.current;

        if (time > gs.nextChangeTime) {
            let nextName;
            if (isSpeaking && gender !== 'male') {
                // Pick a random speaking gesture that isn't the current one
                const pool = SPEAKING_GESTURES.filter(g => g !== gs.name);
                nextName = pool[Math.floor(Math.random() * pool.length)];
            } else {
                nextName = gender === 'male' ? 'idle_male' : 'idle';
            }

            const gesture = GESTURES[nextName];
            const newTargets = {};
            Object.entries(gesture.bones).forEach(([boneName, rotations]) => {
                const def = defs[boneName];
                if (def) {
                    newTargets[boneName] = buildGestureQuat(def, rotations);
                }
            });

            gs.name = nextName;
            gs.targetQuats = newTargets;
            const [minD, maxD] = gesture.duration;
            gs.nextChangeTime = time + minD + Math.random() * (maxD - minD);
        }

        // Lerp currentQuats toward targetQuats
        const lerpSpeed = 0.03; // slow smooth transition
        const cur = currentQuats.current;
        Object.keys(gs.targetQuats).forEach((boneName) => {
            if (!cur[boneName]) cur[boneName] = gs.targetQuats[boneName].clone();
            cur[boneName].slerp(gs.targetQuats[boneName], lerpSpeed);
        });

        // Apply lerped quats to bones
        Object.keys(cur).forEach((boneName) => {
            if (bones[boneName]) {
                bones[boneName].quaternion.copy(cur[boneName]);
            }
        });

        // ============================
        // 2. HAND MICRO-MOVEMENTS
        // Layered on top of gesture — subtle wrist oscillation
        // ============================
        if (bones.LeftHand) {
            const amplitude = isSpeaking ? 0.06 : 0.025;
            // Different freq per hand so they feel independent
            const leftWave = Math.sin(time * 1.3) * amplitude;
            const rotL = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), leftWave);
            bones.LeftHand.quaternion.multiply(rotL);
        }
        if (bones.RightHand) {
            const amplitude = isSpeaking ? 0.06 : 0.025;
            const rightWave = Math.sin(time * 1.7 + 1.2) * amplitude; // phase-offset
            const rotR = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rightWave);
            bones.RightHand.quaternion.multiply(rotR);
        }

        // ============================
        // 3. NATURAL EYE BLINKING
        // ============================
        if (headMeshes.length > 0) {
            const blinkCycle = Math.sin(time * 2.5 + Math.sin(time * 0.7) * 2);
            const isBlinking = blinkCycle > 0.97;
            const targetBlink = isBlinking ? 1 : 0;

            headMeshes.forEach(mesh => {
                const blinkL = mesh.morphTargetDictionary['eyeBlinkLeft'];
                const blinkR = mesh.morphTargetDictionary['eyeBlinkRight'];
                if (blinkL !== undefined) mesh.morphTargetInfluences[blinkL] += (targetBlink - mesh.morphTargetInfluences[blinkL]) * 0.35;
                if (blinkR !== undefined) mesh.morphTargetInfluences[blinkR] += (targetBlink - mesh.morphTargetInfluences[blinkR]) * 0.35;
            });
        }

        // ============================
        // 4. MULTI-VISEME LIP SYNC
        // ============================
        if (headMeshes.length > 0) {
            if (isSpeaking) {
                const vs = visemeState.current;
                if (time > vs.nextChangeTime) {
                    vs.targetViseme = Math.floor(Math.random() * (VISEME_NAMES.length - 1));
                    vs.nextChangeTime = time + 0.07 + Math.random() * 0.06;
                }
                headMeshes.forEach(mesh => {
                    for (let i = 0; i < VISEME_NAMES.length; i++) {
                        const idx = mesh.morphTargetDictionary[VISEME_NAMES[i]];
                        if (idx !== undefined) {
                            // Exaggerate visemes slightly more for male so they show through the beard
                            const multiplier = gender === 'male' ? 1.5 : 1.0;
                            const target = (i === vs.targetViseme) ? ((0.4 + Math.random() * 0.4) * multiplier) : 0;
                            mesh.morphTargetInfluences[idx] += (target - mesh.morphTargetInfluences[idx]) * 0.3;
                        }
                    }
                    const jawIdx = mesh.morphTargetDictionary['jawOpen'];
                    if (jawIdx !== undefined) {
                        const jawMult = gender === 'male' ? 2.0 : 1.0;
                        mesh.morphTargetInfluences[jawIdx] += (((0.1 + Math.abs(Math.sin(time * 12)) * 0.25) * jawMult) - mesh.morphTargetInfluences[jawIdx]) * 0.3;
                    }
                });
            } else {
                headMeshes.forEach(mesh => {
                    for (let i = 0; i < VISEME_NAMES.length; i++) {
                        const idx = mesh.morphTargetDictionary[VISEME_NAMES[i]];
                        if (idx !== undefined) mesh.morphTargetInfluences[idx] *= 0.8;
                    }
                    const jawIdx = mesh.morphTargetDictionary['jawOpen'];
                    if (jawIdx !== undefined) mesh.morphTargetInfluences[jawIdx] *= 0.8;
                });
            }
        }

        // ============================
        // 5. HEAD MICRO-MOVEMENTS
        // ============================
        if (bones.Head && defs['Head']) {
            const hs = headState.current;
            if (isSpeaking) {
                if (time > hs.nextChangeTime) {
                    const nodMult = gender === 'male' ? 1.5 : 1.0; // Extra bobbing effect for male talking
                    hs.targetYaw = (Math.random() - 0.5) * 0.12 * nodMult;
                    hs.targetPitch = (Math.random() - 0.5) * 0.07 * nodMult;
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
            bones.Head.quaternion.copy(defs['Head']).premultiply(headExtra);
        }

        // ============================
        // 6. SUBTLE BREATHING
        // ============================
        if (bones.Spine2) {
            const breathScale = 1 + Math.sin(time * 1.8) * 0.003;
            bones.Spine2.scale.set(breathScale, breathScale, breathScale);
        }
    });

    return (
        <group dispose={null} position={[0, -2.1, 0]}>
            <primitive object={scene} scale={1.3} />
        </group>
    );
}

useGLTF.preload('/models/female.glb');
useGLTF.preload('/models/male.glb');
