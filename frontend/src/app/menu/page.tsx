'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MenuRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/menu/restaurant');
    }, [router]);

    return (
        <div className="min-h-screen bg-[#111115] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f36b24]"></div>
        </div>
    );
}
