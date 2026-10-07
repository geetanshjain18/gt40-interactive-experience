import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'

interface MeshStats {
  vertices: number
  triangles: number
  min: [number, number, number]
  max: [number, number, number]
  size: [number, number, number]
  center: [number, number, number]
  materials: string[]
}

function ModelView({
  yawOffset,
  onLoaded,
}: {
  yawOffset: number
  onLoaded: (stats: MeshStats) => void
}) {
  const { scene } = useGLTF(`${import.meta.env.BASE_URL}models/gt40-gulf-number-6.glb`)
  const groupRef = useRef<THREE.Group>(null)

  useEffect(() => {
    if (!scene) return

    let vertices = 0
    let triangles = 0
    const materials: string[] = []

    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        const geom = mesh.geometry
        if (geom) {
          vertices += geom.attributes.position?.count || 0
          if (geom.index) {
            triangles += geom.index.count / 3
          } else {
            triangles += (geom.attributes.position?.count || 0) / 3
          }
        }
        if (mesh.material) {
          const matName = (mesh.material as THREE.Material).name || 'Unnamed Material'
          if (!materials.includes(matName)) materials.push(matName)
        }
      }
    })

    const box = new THREE.Box3().setFromObject(scene)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)

    onLoaded({
      vertices,
      triangles,
      min: [box.min.x, box.min.y, box.min.z],
      max: [box.max.x, box.max.y, box.max.z],
      size: [size.x, size.y, size.z],
      center: [center.x, center.y, center.z],
      materials,
    })
  }, [scene, onLoaded])

  return (
    <group ref={groupRef} rotation={[0, yawOffset, 0]}>
      <primitive object={scene} />
    </group>
  )
}

function CameraRig({
  viewAngle,
  target,
  distance,
}: {
  viewAngle: string
  target: [number, number, number]
  distance: number
}) {
  const { camera } = useThree()

  useEffect(() => {
    const targetVec = new THREE.Vector3(...target)
    let camPos = new THREE.Vector3(0, target[1] + 1, distance)

    switch (viewAngle) {
      case 'front':
        camPos = new THREE.Vector3(0, target[1] + 0.3, distance)
        break
      case 'rear':
        camPos = new THREE.Vector3(0, target[1] + 0.3, -distance)
        break
      case 'left':
        camPos = new THREE.Vector3(-distance, target[1] + 0.3, 0)
        break
      case 'right':
        camPos = new THREE.Vector3(distance, target[1] + 0.3, 0)
        break
      case 'top':
        camPos = new THREE.Vector3(0, distance * 1.5, 0.01)
        break
      case 'front-three-quarter':
        camPos = new THREE.Vector3(distance * 0.75, target[1] + 0.6, distance * 0.75)
        break
      case 'rear-three-quarter':
        camPos = new THREE.Vector3(-distance * 0.75, target[1] + 0.6, -distance * 0.75)
        break
    }

    camera.position.copy(camPos)
    camera.lookAt(targetVec)
  }, [viewAngle, target, distance, camera])

  return null
}

export function AssetInspector() {
  const [stats, setStats] = useState<MeshStats | null>(null)
  const [yawDeg, setYawDeg] = useState(0)
  const [viewAngle, setViewAngle] = useState('front-three-quarter')
  const [targetLength] = useState(4.8)

  const rawLength = stats ? Math.max(...stats.size) : 1
  const scale = targetLength / rawLength
  const center: [number, number, number] = stats ? stats.center : [0, 0, 0]
  const distance = (targetLength || 4.8) * 1.8

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0B1015', position: 'relative', overflow: 'hidden' }}>
      <Canvas camera={{ position: [5, 2, 5], fov: 40 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} />
        <directionalLight position={[-10, 8, -5]} intensity={0.8} />
        <gridHelper args={[20, 20, '#8FAEC4', '#151D25']} position={[0, stats ? stats.min[1] : 0, 0]} />
        <axesHelper args={[5]} />
        <React.Suspense fallback={null}>
          <ModelView yawOffset={(yawDeg * Math.PI) / 180} onLoaded={setStats} />
        </React.Suspense>
        <CameraRig viewAngle={viewAngle} target={center} distance={distance} />
        <OrbitControls makeDefault />
      </Canvas>

      <div
        id="inspector-panel"
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          width: 380,
          background: 'rgba(21, 29, 37, 0.92)',
          border: '1px solid #8FAEC4',
          borderRadius: 8,
          padding: 16,
          color: '#EDF2F5',
          fontFamily: 'monospace',
          fontSize: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          maxHeight: '90vh',
          overflowY: 'auto',
          zIndex: 100,
        }}
      >
        <h3 style={{ margin: '0 0 10px 0', color: '#8FAEC4', fontSize: 14 }}>ASSET INSPECTION</h3>
        {stats ? (
          <div>
            <p><strong>Vertices:</strong> {stats.vertices.toLocaleString()}</p>
            <p><strong>Triangles:</strong> {stats.triangles.toLocaleString()}</p>
            <p><strong>Materials:</strong> {stats.materials.join(', ')}</p>
            <hr style={{ borderColor: '#2A3644' }} />
            <p><strong>Raw Min:</strong> [{stats.min.map(v => v.toFixed(3)).join(', ')}]</p>
            <p><strong>Raw Max:</strong> [{stats.max.map(v => v.toFixed(3)).join(', ')}]</p>
            <p><strong>Raw Size (X, Y, Z):</strong> [{stats.size.map(v => v.toFixed(3)).join(', ')}]</p>
            <p><strong>Raw Center:</strong> [{stats.center.map(v => v.toFixed(3)).join(', ')}]</p>
            <p><strong>Raw Max Dimension:</strong> {rawLength.toFixed(3)}</p>
            <p><strong>Calculated Scale (for 4.8m):</strong> {scale.toFixed(4)}</p>
            <hr style={{ borderColor: '#2A3644' }} />
            <div style={{ marginBottom: 10 }}>
              <label>Yaw Correction (deg): {yawDeg}°</label>
              <br />
              <input
                id="yaw-slider"
                type="range"
                min="-180"
                max="180"
                step="90"
                value={yawDeg}
                onChange={(e) => setYawDeg(Number(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                {[-180, -90, 0, 90, 180].map((deg) => (
                  <button
                    key={deg}
                    onClick={() => setYawDeg(deg)}
                    style={{
                      flex: 1,
                      background: yawDeg === deg ? '#8FAEC4' : '#1E293B',
                      color: yawDeg === deg ? '#0B1015' : '#EDF2F5',
                      border: 'none',
                      padding: '4px 0',
                      cursor: 'pointer',
                      borderRadius: 3,
                    }}
                  >
                    {deg}°
                  </button>
                ))}
              </div>
            </div>

            <hr style={{ borderColor: '#2A3644' }} />
            <p><strong>Camera Preset:</strong></p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {[
                'front',
                'rear',
                'left',
                'right',
                'top',
                'front-three-quarter',
                'rear-three-quarter',
              ].map((angle) => (
                <button
                  key={angle}
                  id={`preset-${angle}`}
                  onClick={() => setViewAngle(angle)}
                  style={{
                    background: viewAngle === angle ? '#8FAEC4' : '#1E293B',
                    color: viewAngle === angle ? '#0B1015' : '#EDF2F5',
                    border: 'none',
                    padding: '6px 8px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: 11,
                  }}
                >
                  {angle}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p>Loading GT40 / GULF STUDY...</p>
        )}
      </div>
    </div>
  )
}
