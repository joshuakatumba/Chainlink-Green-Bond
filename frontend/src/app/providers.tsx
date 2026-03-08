'use client';

import * as React from 'react';
import '@rainbow-me/rainbowkit/styles.css';

import {
  RainbowKitProvider,
  getDefaultConfig,
  darkTheme,
} from '@rainbow-me/rainbowkit';

import {
  argentWallet,
  trustWallet,
  ledgerWallet,
} from '@rainbow-me/rainbowkit/wallets';

import { sepolia, arbitrumSepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';

const config = getDefaultConfig({
  appName: 'Green Bond Protocol',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID', // Register at https://cloud.walletconnect.com to get a project ID
  chains: [sepolia, arbitrumSepolia],
  wallets: [
    {
      groupName: 'Recommended',
      wallets: [argentWallet, trustWallet, ledgerWallet],
    },
  ],
  ssr: true,
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}