import React, { useEffect, useRef } from 'react';

export default function CameraBackground() {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        let stream: MediaStream | null = null;
        let mounted = true;

        const startCamera = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'environment', // Use rear camera on mobile
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    },
                    audio: false
                });

                if (mounted && videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
            }
        };

        startCamera();

        return () => {
            mounted = false;
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    return (
        <div className="fixed inset-0 z-0 bg-black overflow-hidden pointer-events-none">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
            />
            {/* Overlay gradient to ensure text readability if needed, matches original design */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40"></div>
        </div>
    );
}
