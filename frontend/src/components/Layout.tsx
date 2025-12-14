import React from 'react';
import { ThemeProvider } from './theme-provider';
import Navbar from './Navbar';
import { Footer } from './flickering-footer';


const Layout = ({ children } : { children: React.ReactNode }) => {

  return (
    // <div className="min-h-screen bg-background text-foreground flex flex-col">
    //   <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
    //     <div className="container flex h-14 items-center justify-between px-4 md:px-8">
    //       <div className="flex items-center gap-2">
    //         <ShieldCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
    //         <span className="hidden font-bold sm:inline-block">Decentralized Uptime</span>
    //       </div>
          
    //       <nav className="flex items-center gap-6 text-sm">
    //         <Link to="/" className={getLinkClass('/')}>Home</Link>
    //         <Link to="/client" className={getLinkClass('/client')}>Client Dashboard</Link>
    //         <Link to="/validator" className={getLinkClass('/validator')}>Validator Node</Link>
    //       </nav>

    //       <div className="flex items-center gap-2">
    //         <ThemeToggle />
    //         <Button size="sm">Connect Wallet</Button>
    //       </div>
    //     </div>
    //   </header>
    //   <main className="flex-1 container px-4 py-6 md:px-8">
    //     {children}
    //   </main>
    //   <footer className="border-t py-6 md:py-0">
    //     <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row px-4">
    //       <p className="text-sm text-muted-foreground">
    //         © 2025 Decentralized Uptime Network. Built on Solana.
    //       </p>
    //     </div>
    //   </footer>
    // </div>
    <ThemeProvider  defaultTheme="system" storageKey='uptimechain-ui-theme'>
    <div className='min-h-screen flex flex-col container mx-auto'>
      <Navbar className='z-50 sticky top-0 bg-background'/>
    {children}
    <Footer/>
    </div>
    </ThemeProvider>
  );
};

export default Layout;