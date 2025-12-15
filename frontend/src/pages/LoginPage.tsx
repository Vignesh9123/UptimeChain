import {LoginComponent} from "@/components/animated-characters-login-page";
import { useUserStore } from "@/store/userStore";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
const Login = () => {
    const {user, isAuthenticated, isLoading} = useUserStore();
    const navigate = useNavigate();
    useEffect(() => {
        if (isAuthenticated && !isLoading && user) {
            navigate(isAuthenticated && user.role.toLowerCase() === "client" ? "/client" : isAuthenticated && user?.role.toLowerCase() === "validator" ? "/validator" : "/login");
        }
    }, [isAuthenticated, isLoading, user]);
    return (
        <>
            <LoginComponent />
        </>
    );
};

export default Login;