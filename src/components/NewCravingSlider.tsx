import { useState, useEffect, useRef } from 'react';
import {
    identifyCravingFromText,
    identifyCravingFromLink,
    identifyCravingFromAudio,
    generateFoodImage,
} from '../services/gemini';

interface NewCravingSliderProps {
    onCravingIdentified: (name: string, image?: string) => void;
    title?: string;
    subtitle?: string;
    variant?: 'dark' | 'light';
    className?: string;
    skipImageGeneration?: boolean;
}

export default function NewCravingSlider({
    onCravingIdentified,
    title = "Add to 'Craving'",
    subtitle = 'Hey, I want to eat...',
    variant = 'dark',
    className,
    skipImageGeneration = false,
}: NewCravingSliderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStatus, setProcessingStatus] = useState('Recognizing...');
    const [isTyping, setIsTyping] = useState(false);
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [textInputValue, setTextInputValue] = useState('');
    const [linkInputValue, setLinkInputValue] = useState('');
    const [dragX, setDragX] = useState(0);
    const [containerWidth, setContainerWidth] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);
    const textInputRef = useRef<HTMLInputElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    useEffect(() => {
        if (containerRef.current) {
            setContainerWidth(containerRef.current.offsetWidth);
        }
    }, []);

    useEffect(() => {
        if (isTyping && textInputRef.current) {
            textInputRef.current.focus();
        }
    }, [isTyping]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.start();
        } catch (err) {
            console.error('Error accessing microphone:', err);
            setIsRecording(false);
        }
    };

    const stopRecording = async (shouldProcess: boolean) => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
            mediaRecorderRef.current.onstop = async () => {
                if (shouldProcess) {
                    setIsProcessing(true);
                    setProcessingStatus('Listening...');
                    setDragX(0);

                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    const reader = new FileReader();
                    reader.readAsDataURL(audioBlob);
                    reader.onloadend = async () => {
                        setProcessingStatus('Analyzing...');
                        const base64Data = (reader.result as string).split(',')[1];
                        const result = await identifyCravingFromAudio(base64Data);

                        if (result?.foodName) {
                            let image: string | undefined;
                            if (!skipImageGeneration) {
                                setProcessingStatus('Generating Image...');
                                image = await generateFoodImage(result.foodName) || undefined;
                            }
                            // Use rawText if available (preserves store info like "在Asda买")
                            // Otherwise fall back to foodName
                            const textForCallback = result.rawText || result.foodName;
                            onCravingIdentified(textForCallback, image);
                        } else {
                            console.log('No food identified');
                        }
                        setIsProcessing(false);
                        setIsRecording(false);
                    };
                } else {
                    setIsRecording(false);
                    setDragX(0);
                }
            };
        } else {
            setIsRecording(false);
            setDragX(0);
        }
    };

    const handleInputStart = () => {
        if (isProcessing || isTyping || showLinkInput) return;
        setIsRecording(true);
        startRecording();
    };

    const handleInputMove = (e: React.TouchEvent | React.MouseEvent) => {
        if (!isRecording || isProcessing) return;

        let clientX: number;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
        } else {
            if ((e as React.MouseEvent).buttons !== 1) return;
            clientX = (e as React.MouseEvent).clientX;
        }

        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const knobWidth = 52;
        const maxDrag = rect.width - knobWidth - 52;

        let offsetX = clientX - rect.left - knobWidth / 2;
        offsetX = Math.max(0, Math.min(offsetX, maxDrag));

        setDragX(offsetX);
    };

    const handleInputEnd = () => {
        if (isProcessing || !isRecording) return;

        const knobWidth = 52;
        const maxDrag = containerWidth - knobWidth - 52;
        const threshold = maxDrag * 0.8;

        if (dragX > threshold) {
            stopRecording(true);
        } else {
            stopRecording(false);
        }
    };

    const handleTextSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!textInputValue.trim()) {
            setIsTyping(false);
            return;
        }

        setIsTyping(false);
        setIsProcessing(true);
        setProcessingStatus('Analyzing...');

        // For Shopping List (skipImageGeneration=true), pass raw text directly
        // This preserves store info like "在Asda买牛奶"
        if (skipImageGeneration) {
            onCravingIdentified(textInputValue.trim());
            setIsProcessing(false);
            setTextInputValue('');
            return;
        }

        // For Cravings page, use Gemini to extract food name and generate image
        const result = await identifyCravingFromText(textInputValue);

        if (result?.foodName) {
            let image: string | undefined;
            setProcessingStatus('Generating Image...');
            image = await generateFoodImage(result.foodName) || undefined;
            onCravingIdentified(result.foodName, image);
        }

        setIsProcessing(false);
        setTextInputValue('');
    };

    const handleLinkSubmit = async () => {
        if (!linkInputValue.trim()) return;
        setIsProcessing(true);
        setProcessingStatus('Analyzing Link...');

        const result = await identifyCravingFromLink(linkInputValue);
        setShowLinkInput(false);
        setLinkInputValue('');

        if (result?.foodName) {
            let image: string | undefined;
            if (!skipImageGeneration) {
                setProcessingStatus('Generating Image...');
                image = await generateFoodImage(result.foodName) || undefined;
            }
            onCravingIdentified(result.foodName, image);
        } else {
            console.log('Could not identify food from link');
        }

        setIsProcessing(false);
    };

    // Style configurations based on variant
    const containerStyle =
        variant === 'light'
            ? 'bg-white/80 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-white/50'
            : 'bg-black/60 backdrop-blur-2xl shadow-[0_15px_40px_-10px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.15)] border border-white/10';

    const textMainStyle = variant === 'light' ? 'text-slate-900' : 'text-white';
    const textSubStyle = variant === 'light' ? 'text-slate-500' : 'text-[#8E8E93]';
    const inputStyle = variant === 'light' ? 'text-slate-900 placeholder-slate-400' : 'text-white placeholder-white/30';
    const plusButtonStyle =
        variant === 'light'
            ? 'bg-white/50 hover:bg-white/80 border-transparent text-slate-600'
            : 'bg-[#3A3A3C] hover:bg-[#48484A] border-white/5 text-white';

    const positionClass = className || 'absolute bottom-8 left-6 right-6';

    return (
        <div className={`${positionClass} z-50 flex flex-col items-center`}>
            {showLinkInput && (
                <div className="mb-3 w-full max-w-[340px] p-1 glass-panel-thick !bg-black/70 !border-white/10 rounded-2xl animate-slide-in shadow-2xl backdrop-blur-xl">
                    <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
                        <span className="material-symbols-outlined text-white/50 text-[20px]">link</span>
                        <input
                            type="text"
                            value={linkInputValue}
                            onChange={(e) => setLinkInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleLinkSubmit()}
                            placeholder="Paste recipe link..."
                            className="bg-transparent border-none text-white text-sm placeholder-white/30 focus:ring-0 w-full p-0 focus:outline-none"
                            autoFocus
                        />
                        <button
                            type="button"
                            className="text-blue-400 font-bold text-xs uppercase tracking-wider"
                            onClick={handleLinkSubmit}
                        >
                            Add
                        </button>
                    </div>
                </div>
            )}

            <div
                ref={containerRef}
                className={`relative w-full max-w-[340px] h-[64px] rounded-full flex items-center overflow-hidden select-none transition-colors ${containerStyle}`}
                onTouchMove={handleInputMove}
                onMouseMove={handleInputMove}
                onMouseUp={handleInputEnd}
                onMouseLeave={handleInputEnd}
                onTouchEnd={handleInputEnd}
            >
                <div
                    className="absolute left-0 top-0 bottom-0 bg-blue-500/10 transition-all duration-75 ease-linear rounded-l-full"
                    style={{ width: `${dragX + 32}px`, opacity: isRecording ? 1 : 0 }}
                />

                <div
                    className="absolute left-[72px] right-[60px] top-0 bottom-0 flex flex-col justify-center transition-all duration-300 cursor-pointer z-10"
                    style={{
                        opacity: isRecording || isProcessing || isTyping ? 0 : 1,
                        transform: isRecording ? 'translateX(20px)' : 'none',
                        pointerEvents: isRecording ? 'none' : 'auto',
                    }}
                    onClick={() => setIsTyping(true)}
                >
                    <span className={`text-[15px] font-bold leading-tight ${textMainStyle}`}>{title}</span>
                    <span className={`text-[11px] font-medium leading-tight mt-0.5 truncate ${textSubStyle}`}>{subtitle}</span>
                </div>

                <form
                    onSubmit={handleTextSubmit}
                    className="absolute left-[68px] right-[68px] top-0 bottom-0 flex items-center transition-all duration-300 z-20"
                    style={{
                        opacity: isTyping ? 1 : 0,
                        pointerEvents: isTyping ? 'auto' : 'none',
                        transform: isTyping ? 'none' : 'translateY(10px)',
                    }}
                >
                    <input
                        ref={textInputRef}
                        type="text"
                        value={textInputValue}
                        onChange={(e) => setTextInputValue(e.target.value)}
                        onBlur={() => !textInputValue && setIsTyping(false)}
                        placeholder="Type item name..."
                        className={`w-full bg-transparent border-none text-[15px] font-medium focus:ring-0 focus:outline-none p-0 ${inputStyle}`}
                    />
                </form>

                <div
                    className="absolute left-[72px] right-16 top-0 bottom-0 flex items-center transition-all duration-300 pointer-events-none"
                    style={{ opacity: isRecording && !isProcessing ? 1 : 0 }}
                >
                    <span className="text-blue-500 text-[14px] font-semibold animate-pulse tracking-wide">
                        Listening... Slide →
                    </span>
                </div>

                <div
                    className={`absolute inset-0 flex items-center justify-center gap-3 transition-opacity duration-300 z-30 rounded-full ${variant === 'light' ? 'bg-white' : 'bg-[#1C1C1E]'} ${isProcessing ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                >
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className={`font-medium text-xs tracking-wide ${textMainStyle}`}>{processingStatus}</span>
                </div>

                <div
                    className="absolute left-2 top-2 bottom-2 w-[48px] h-[48px] rounded-full bg-[#007AFF] flex items-center justify-center shadow-[0_4px_12px_rgba(59,130,246,0.3)] z-20 cursor-grab active:cursor-grabbing touch-none"
                    style={{
                        transform: `translateX(${dragX}px)`,
                        transition: isRecording ? 'none' : 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    }}
                    onTouchStart={handleInputStart}
                    onMouseDown={handleInputStart}
                >
                    <span
                        className={`material-symbols-outlined text-white text-[24px] transition-transform duration-300 ${isRecording ? 'scale-110' : 'scale-100'}`}
                    >
                        mic
                    </span>
                    {isRecording && <div className="absolute inset-0 rounded-full border border-white/30 animate-ping" />}
                </div>

                <button
                    type="button"
                    className={`absolute right-2 top-2 bottom-2 w-[48px] h-[48px] rounded-full flex items-center justify-center z-20 transition-all duration-300 active:scale-90 border ${plusButtonStyle}`}
                    onClick={() => setShowLinkInput(!showLinkInput)}
                    style={{ opacity: isRecording ? 0.3 : 1 }}
                >
                    <span
                        className={`material-symbols-outlined text-[24px] transition-transform duration-300 ${showLinkInput ? 'rotate-[135deg]' : 'rotate-0'}`}
                    >
                        add
                    </span>
                </button>
            </div>
        </div>
    );
}
