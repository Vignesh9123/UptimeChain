import { useEffect } from "react"
import { useUserStore } from "../store/userStore"
import { Loader2 } from "lucide-react"
import { useLocation } from "react-router-dom"
export const AuthProvider = ({children}: {children: React.ReactNode}) => {
    const {checkAuth,  isLoading} = useUserStore();
    const location = useLocation();
    useEffect(() => {
        checkAuth();
    }, [])
    
    if (isLoading && location.pathname !== "/") {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <>
        {children}
        </>
    )
}