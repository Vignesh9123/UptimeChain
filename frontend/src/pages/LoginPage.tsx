import {LoginComponent} from "@/components/animated-characters-login-page";
import { useUserStore } from "@/store/userStore";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
const Login = () => {
    const {user, isAuthenticated, isLoading} = useUserStore();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    useEffect(() => {
        if (isAuthenticated && !isLoading && user) {
            navigate(isAuthenticated && user.role.toLowerCase() === "client" ? "/client" : isAuthenticated && user?.role.toLowerCase() === "validator" ? "/validator" : "/login");
        }
    }, [isAuthenticated, isLoading, user]);
    return (
        <>
            <LoginComponent roleFromQuery={searchParams.get("role") || undefined} />
        </>
    );
};

export default Login;