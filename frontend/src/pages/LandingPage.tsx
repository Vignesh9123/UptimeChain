import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, Lock, Zap } from 'lucide-react';
import HeroSectionOne from '@/components/hero-section-demo-1';
import { MagicCard } from '@/components/ui/magic-card';
import { Particles } from '@/components/ui/particles';
import {useTheme} from '@/components/theme-provider'
import GlobeComponent from '@/components/ReactGlobe';
import { axiosClient, getRandomMarkersFromData } from '@/config';
import { useEffect, useState } from 'react';

const LandingPage = () => {
    const {theme} = useTheme()
    
  return (
    <div className="">
      {/* Hero Section */}
      <HeroSectionOne/>
      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-5 mb-10">
        {/* <Card className="w-full max-w-sm border-none p-0 shadow-none"> */}
        <MagicCard
        gradientFrom={theme == "dark" ? "#262626" : "#9ca3af"}
        gradientTo={theme == "dark" ? "#9ca3af" : "#262626"}
        className="flex flex-col gap-6 rounded-xl border shadow-sm justify-around py-6"
      >
        <Particles
        className="absolute inset-0 z-0"
        quantity={100}
        ease={80}
        color={theme == "dark" ? "#9ca3af" : "#262626"}
        refresh
      />
          <CardHeader>
            <Globe className="w-10 h-10 text-blue-500 mb-2" />
            <CardTitle className='text-foreground'>Global Validation</CardTitle>
          </CardHeader>
          <CardContent className="text-foreground mt-1">
            Tasks are distributed to validators worldwide to ensure accurate regional latency and uptime checks.
          </CardContent>
        </MagicCard>
        {/* </Card> */}
        <MagicCard
 gradientFrom={theme == "dark" ? "#262626" : "#9ca3af"}
 gradientTo={theme == "dark" ? "#9ca3af" : "#262626"}
        className="flex flex-col gap-6 rounded-xl border shadow-sm justify-around py-6"
      >
        <Particles
        className="absolute inset-0 z-0"
        quantity={100}
        ease={80}
        color={theme == "dark" ? "#9ca3af" : "#262626"}
        refresh
      />
          <CardHeader>
            <Lock className="w-10 h-10 text-blue-500 mb-2" />
            <CardTitle>Cryptographic Proofs</CardTitle>
          </CardHeader>
          <CardContent className="text-foreground mt-1">
            Every check is digitally signed and verified on-chain, eliminating the risk of false reporting by centralized providers.
          </CardContent>
        </MagicCard>
        <MagicCard
        // gradientColor={ resolvedTheme "#9ca3af" }
        gradientFrom={theme == "dark" ? "#262626" : "#9ca3af"}
        gradientTo={theme == "dark" ? "#9ca3af" : "#262626"}


        className="flex flex-col gap-6 rounded-xl border shadow-sm justify-around py-6"
      >
        <Particles
        className="absolute inset-0 z-0"
        quantity={100}
        ease={80}
        color={theme == "dark" ? "#9ca3af" : "#262626"}
        refresh
      />
          <CardHeader>
            <Zap className="w-10 h-10 text-blue-500 mb-2" />
            <CardTitle>Earn Crypto</CardTitle>
          </CardHeader>
          <CardContent className="text-foreground mt-1">
            Run a lightweight node, perform SSL and uptime checks, and get paid instantly via Solana smart contracts.
          </CardContent>
        </MagicCard>
      </div>
      <GlobeComponent />
    </div>
  );
};

export default LandingPage;