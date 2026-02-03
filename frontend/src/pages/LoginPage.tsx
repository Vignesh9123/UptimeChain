import { LoginComponent } from "@/components/animated-characters-login-page";
import { useSearchParams } from "react-router-dom";

const Login = () => {
    const [searchParams] = useSearchParams();
    return (
        <>
            <LoginComponent roleFromQuery={searchParams.get("role") || undefined} />
        </>
    );
};

export default Login;