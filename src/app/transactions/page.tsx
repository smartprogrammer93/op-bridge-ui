'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// This is a placeholder - in production, fetch from indexer or local storage
export default function TransactionsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Transaction History</h1>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pending Withdrawals</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-sm">
            No pending withdrawals. Withdrawals you initiate will appear here.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-sm">
            Connect your wallet to see your transaction history.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
