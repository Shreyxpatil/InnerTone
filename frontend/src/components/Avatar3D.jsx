import React, { useRef, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

export function Avatar3D({ aiState }) {
    // Load the GLB model from the local public folder
    const { scene } = useGLTF('/models/avatar.glb');

    // Ref to the mesh that contains the morphTargets (usually the head)
    const headMeshRef = useRef(null);

    useEffect(() => {
        // Traverse the 3D scene graph to find the SkinnedMesh with morphTargetDictionary
        scene.traverse((child) => {
            if (child.isMesh) {
                // If this mesh has the visemes/morphs, track it
                if (child.morphTargetDictionary) {
                    headMeshRef.current = child;
                }
                // Fallback: track the first mesh if no morph targets exist
                else if (!headMeshRef.current) {
                    headMeshRef.current = child;
                }
            }
        });
    }, [scene]);

    // The animation loop that runs 60 times a second
    useFrame((state) => {
        const head = headMeshRef.current;
        if (!head) return;

        const time = state.clock.elapsedTime;

        // 1. Natural Blinking Logic
        const isBlinking = Math.sin(time * 3) > 0.98;
        const targetBlink = isBlinking ? 1 : 0;

        if (head.morphTargetDictionary && head.morphTargetDictionary['eyeBlinkLeft'] !== undefined) {
            const blinkIndexL = head.morphTargetDictionary['eyeBlinkLeft'];
            const blinkIndexR = head.morphTargetDictionary['eyeBlinkRight'];
            head.morphTargetInfluences[blinkIndexL] += (targetBlink - head.morphTargetInfluences[blinkIndexL]) * 0.3;
            head.morphTargetInfluences[blinkIndexR] += (targetBlink - head.morphTargetInfluences[blinkIndexR]) * 0.3;
        }

        // 2. Audio-Driven Lip Sync Logic 
        // Target an arbitrary volume simulator
        let targetVolume = aiState === 'speaking' ? 0.2 + Math.abs(Math.sin(time * 15)) * 0.6 : 0;

        // Try standard viseme morph targets first
        if (head.morphTargetDictionary && (head.morphTargetDictionary['mouthOpen'] !== undefined || head.morphTargetDictionary['jawOpen'] !== undefined || head.morphTargetDictionary['Surprised'] !== undefined)) {
            const mouthOpenIdx = head.morphTargetDictionary['mouthOpen'] ?? head.morphTargetDictionary['jawOpen'] ?? head.morphTargetDictionary['Surprised'];
            head.morphTargetInfluences[mouthOpenIdx] += (targetVolume - head.morphTargetInfluences[mouthOpenIdx]) * 0.4;
        } else {
            // FALLBACK: If the model has no visemes (like RobotExpressive), just scale the head slightly based on audio to simulate talking
            const scaleTarget = 1 + (targetVolume * 0.1); // max 10% scale bump
            head.scale.y += (scaleTarget - head.scale.y) * 0.4;
        }
    });

    // Render the loaded 3D GLB scene
    // Positioned slightly down and scaled up to fit the portrait framing
    return (
        <group dispose={null} position={[0, -1.75, 0]}>
            <primitive object={scene} scale={1.2} />
        </group>
    );
}

// Preload the model so the canvas doesn't hang when trying to fetch it
useGLTF.preload('/models/avatar.glb');
