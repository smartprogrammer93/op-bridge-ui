import Link from 'next/link';
import { ArrowDownToLine, ArrowUpFromLine, Clock, Shield } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
      {/* Gradient orb */}
      <div className="gradient-orb" />
      
      {/* Hero */}
      <div className="text-center mb-12 relative z-10">
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
          Nethermind <span className="text-violet-400">Bridge</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-md mx-auto">
          Bridge your assets between Ethereum and OP Stack chains securely.
        </p>
      </div>

      {/* Action Cards */}
      <div className="grid md:grid-cols-2 gap-6 w-full max-w-2xl relative z-10">
        <Link href="/deposit" className="group">
          <div className="bg-[#12121a]/80 backdrop-blur-xl rounded-2xl border border-white/5 p-6 transition-all hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/10">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <ArrowDownToLine className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Deposit</h2>
            <p className="text-gray-400 text-sm">
              Bridge ETH from Ethereum to L2. Fast and secure.
            </p>
            <div className="flex items-center gap-2 mt-4 text-violet-400 text-sm font-medium">
              <span>Start bridging</span>
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>

        <Link href="/withdraw" className="group">
          <div className="bg-[#12121a]/80 backdrop-blur-xl rounded-2xl border border-white/5 p-6 transition-all hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/10">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <ArrowUpFromLine className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Withdraw</h2>
            <p className="text-gray-400 text-sm">
              Bridge ETH from L2 back to Ethereum mainnet.
            </p>
            <div className="flex items-center gap-2 mt-4 text-violet-400 text-sm font-medium">
              <span>Start withdrawal</span>
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-6 w-full max-w-3xl mt-16 relative z-10">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-3">
            <Shield className="w-5 h-5 text-violet-400" />
          </div>
          <h3 className="text-white font-medium mb-1">Secure</h3>
          <p className="text-sm text-gray-500">Native OP Stack bridge with proven security</p>
        </div>
        <div className="text-center">
          <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-3">
            <Clock className="w-5 h-5 text-violet-400" />
          </div>
          <h3 className="text-white font-medium mb-1">Fast Deposits</h3>
          <p className="text-sm text-gray-500">Deposits arrive on L2 within minutes</p>
        </div>
        <div className="text-center">
          <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h3 className="text-white font-medium mb-1">Non-Custodial</h3>
          <p className="text-sm text-gray-500">You maintain full control of your assets</p>
        </div>
      </div>
    </div>
  );
}
