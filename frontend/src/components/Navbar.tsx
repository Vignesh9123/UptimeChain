import { AnimatedThemeToggler } from "./ui/animated-theme-toggler";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useUserStore } from "../store/userStore";
const Navbar = ({className}: {className?: string}) => {
    const [isScrolled, setIsScrolled] = useState(false);
    const {user, isAuthenticated} = useUserStore();
    useEffect(() => {
      const handleScroll = () => {
        setIsScrolled(window.scrollY > 30);
      };
  
      window.addEventListener("scroll", handleScroll);
  
      return () => {
        window.removeEventListener("scroll", handleScroll);
      };
    }, [])
    return (
      <nav className={cn("flex w-full items-center justify-between border-t border-b border-neutral-200 px-4 py-4 dark:border-neutral-800", className, isScrolled && "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 translate-y-1 w-[calc(100%-32px)] mx-auto duration-400 rounded-lg border border-muted")}>
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-full bg-gradient-to-br from-violet-500 to-pink-500" />
          <h1 className="text-base font-bold md:text-2xl">UptimeChain</h1>
        </div>
        <div className="flex items-center gap-2">
          <AnimatedThemeToggler className="p-2 border rounded-md hover:bg-muted hover:-translate-y-1 duration-300 cursor-pointer"/>
        <Link to={isAuthenticated && user?.role.toLowerCase() === "client" ? "/client" : isAuthenticated && user?.role.toLowerCase() === "validator" ? "/validator" : "/login"} className="transform rounded-lg bg-black px-6 py-2 font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-800 md:w-32 dark:bg-white dark:text-black dark:hover:bg-gray-200 text-center">
          {isAuthenticated ? "Dashboard" : "Login"}
        </Link>
        </div>
      </nav>
    );
  };
  
export default Navbar