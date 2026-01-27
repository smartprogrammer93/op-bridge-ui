import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">🌉 OP Bridge</h1>
        <p className="text-gray-400 max-w-md">
          Bridge your assets between Ethereum and L2 securely.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 w-full max-w-2xl">
        <Card className="hover:border-blue-500 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownToLine className="h-5 w-5" />
              Deposit
            </CardTitle>
            <CardDescription>
              Move assets from Ethereum to L2
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/deposit">
              <Button className="w-full">Start Deposit</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:border-blue-500 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpFromLine className="h-5 w-5" />
              Withdraw
            </CardTitle>
            <CardDescription>
              Move assets from L2 to Ethereum
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/withdraw">
              <Button className="w-full">Start Withdrawal</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
