"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls, Center, Grid, Stage } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import * as THREE from "three";
import { Button } from "@/client/components/ui/button";
import { Typography } from "@/client/components/ui/typography";
import { Download, Loader2, RefreshCw, ZoomIn } from "lucide-react";

interface ModelMeshProps {
  url: string;
}

function ModelMesh({ url }: ModelMeshProps) {
  // Load the STL geometry
  const geom = useLoader(STLLoader, url);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  return (
    <mesh geometry={geom} castShadow receiveShadow>
      <meshStandardMaterial
        ref={materialRef}
        color="#fbbf24" // Bright premium gold/amber color
        roughness={0.2}
        metalness={0.8}
      />
    </mesh>
  );
}

interface ModelViewerProps {
  sessionId: string;
  reloadKey: number;
}

export function ModelViewer({ sessionId, reloadKey }: ModelViewerProps) {
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchModelUrl = async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/model/${sessionId}`);
      if (!res.ok) {
        throw new Error("No model generated yet.");
      }
      const data = await res.json();
      if (data.url) {
        setModelUrl(data.url);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load model.");
      setModelUrl(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModelUrl();
  }, [sessionId, reloadKey]);

  const handleDownload = () => {
    if (modelUrl) {
      const a = document.createElement("a");
      a.href = modelUrl;
      a.download = `model-${sessionId.substring(0, 8)}.stl`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className="h-full w-full relative flex flex-col bg-gray-950 text-white overflow-hidden rounded-2xl border border-gray-800 shadow-2xl">
      {/* Top Header */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1 pointer-events-none">
        <Typography variant="small" className="font-bold text-gray-400 uppercase tracking-wider">
          3D Canvas
        </Typography>
        <Typography variant="h4" className="font-extrabold text-white">
          Lattice STL Previewer
        </Typography>
      </div>

      {/* Floating Controls */}
      {modelUrl && (
        <div className="absolute bottom-4 right-4 z-10 flex gap-2">
          <Button
            onClick={fetchModelUrl}
            variant="outline"
            className="rounded-xl bg-gray-900/80 border-gray-800 hover:bg-gray-800 text-white h-10 px-4 backdrop-blur-md"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={handleDownload}
            variant="brand"
            className="rounded-xl h-10 px-4"
          >
            <Download className="w-4 h-4 mr-2" />
            Export STL
          </Button>
        </div>
      )}

      {/* 3D Scene */}
      <div className="flex-1 w-full h-full">
        {loading ? (
          <div className="h-full w-full flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-yellow-400" />
            <Typography variant="muted" className="text-gray-400">
              Retrieving generated 3D geometry...
            </Typography>
          </div>
        ) : error || !modelUrl ? (
          <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mb-4 border border-gray-800">
              <ZoomIn className="w-8 h-8 text-gray-500" />
            </div>
            <Typography variant="h4" className="mb-2 text-gray-300">
              Waiting for Geometry
            </Typography>
            <Typography variant="muted" className="text-gray-500 max-w-xs">
              Tell the agent what you want to build on the right panel to generate the 3D model.
            </Typography>
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="h-full w-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
              </div>
            }
          >
            <Canvas shadows camera={{ position: [100, 100, 100], fov: 45 }}>
              <color attach="background" args={["#030712"]} />
              
              <Stage intensity={0.6} environment="city" adjustCamera={1.2}>
                <Center>
                  <ModelMesh url={modelUrl} />
                </Center>
              </Stage>

              <OrbitControls makeDefault enableDamping minDistance={10} maxDistance={500} />
              
              <Grid
                renderOrder={-1}
                position={[0, -20, 0]}
                cellSize={10}
                cellThickness={1}
                cellColor="#1f2937"
                sectionSize={50}
                sectionThickness={1.5}
                sectionColor="#374151"
                fadeDistance={300}
                infiniteGrid
              />
            </Canvas>
          </Suspense>
        )}
      </div>
    </div>
  );
}
