'use client';

import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { LogIn, UserPlus, X } from 'lucide-react';

interface LoginRequiredModalProps {
    isOpen: boolean;
    onClose: () => void;
    message?: string;
    returnUrl?: string;
}

export function LoginRequiredModal({
    isOpen,
    onClose,
    message = 'Please register or login to continue with your order.',
    returnUrl = '/checkout'
}: LoginRequiredModalProps) {
    const router = useRouter();

    if (!isOpen) return null;

    const handleLogin = () => {
        // Store return URL in session storage
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('returnUrl', returnUrl);
        }
        router.push('/auth/login');
    };

    const handleRegister = () => {
        // Store return URL in session storage
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('returnUrl', returnUrl);
        }
        router.push('/auth/register');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <Card className="relative z-10 w-full max-w-md mx-4 bg-[#18181c] border-[#23232a]">
                <CardHeader className="relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-[#bdbdbd] hover:text-white transition-colors"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                    <CardTitle className="text-white text-2xl" style={{ fontFamily: 'var(--font-el-messiri)' }}>
                        Authentication Required
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <p className="text-[#bdbdbd] text-center">
                        {message}
                    </p>

                    <div className="space-y-3">
                        <Button
                            onClick={handleLogin}
                            className="w-full bg-[#f36b24] hover:bg-[#d65a18] text-white font-bold py-6 text-lg flex items-center justify-center gap-2"
                        >
                            <LogIn className="h-5 w-5" />
                            Log In
                        </Button>

                        <Button
                            onClick={handleRegister}
                            variant="outline"
                            className="w-full border-[#23232a] text-[#f36b24] hover:bg-[#23232a] hover:text-white py-6 text-lg flex items-center justify-center gap-2"
                        >
                            <UserPlus className="h-5 w-5" />
                            Create Account
                        </Button>
                    </div>

                    <p className="text-xs text-[#666] text-center">
                        You'll be redirected back to checkout after logging in
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
