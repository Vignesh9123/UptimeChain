import React from 'react';
import { ThemeProvider } from './theme-provider';
import Navbar from './Navbar';
import { Footer } from './flickering-footer';


const Layout = ({ children } : { children: React.ReactNode }) => {

  return (
    <ThemeProvider  defaultTheme="system" storageKey='uptimechain-ui-theme'>
    <div className='min-h-screen flex flex-col container mx-auto px-2'>
      <Navbar className='z-50 sticky top-0 bg-background'/>
    {children}
    <Footer/>
    </div>
    </ThemeProvider>
  );
};

export default Layout;