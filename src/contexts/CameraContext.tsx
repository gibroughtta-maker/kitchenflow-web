import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CameraContextType {
    isCameraActive: boolean;
    setIsCameraActive: (active: boolean) => void;
    toggleCamera: () => void;
}

const CameraContext = createContext<CameraContextType | undefined>(undefined);

export const CameraProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isCameraActive, setIsCameraActive] = useState(false);

    const toggleCamera = () => setIsCameraActive(prev => !prev);

    return (
        <CameraContext.Provider value={{ isCameraActive, setIsCameraActive, toggleCamera }}>
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
