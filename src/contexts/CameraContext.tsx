import React, { createContext, useContext, useState, useRef, ReactNode, RefObject } from 'react';

interface CameraContextType {
    isCameraActive: boolean;
    setIsCameraActive: (active: boolean) => void;
    toggleCamera: () => void;
    videoRef: RefObject<HTMLVideoElement>;
    capturePhoto: () => Promise<File | null>;
}

const CameraContext = createContext<CameraContextType | undefined>(undefined);

export const CameraProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isCameraActive, setIsCameraActive] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const toggleCamera = () => setIsCameraActive(prev => !prev);

    const capturePhoto = async (): Promise<File | null> => {
        if (!videoRef.current) return null;

        const video = videoRef.current;
        if (video.readyState < 2) return null; // Not ready

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) return null;

        // Draw current video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    resolve(null);
                    return;
                }
                const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
                resolve(file);
            }, 'image/jpeg', 0.95);
        });
    };

    return (
        <CameraContext.Provider value={{ isCameraActive, setIsCameraActive, toggleCamera, videoRef, capturePhoto }}>
            {children}
        </CameraContext.Provider>
    );
};

export const useCamera = () => {
    const context = useContext(CameraContext);
    if (context === undefined) {
        throw new Error('useCamera must be used within a CameraProvider');
    }
    return context;
};

