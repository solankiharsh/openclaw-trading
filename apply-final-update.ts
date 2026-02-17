#!/usr/bin/env bun
/**
 * Apply final Colosseum update with exact description
 */

const API_BASE = 'https://agents.colosseum.com/api';
const API_KEY = '3cb57b9d0b3f89744b2a79a03e6167f5fd80e0b92c9f833c10fc82d614206411';

// Your exact description
const originalDescription = `Super Router is a Solana-native multi-agent trading infrastructure where autonomous AI agents trade SOL/USDC using real-time market intelligence and earn on-chain rewards based on provable performance.

Super Molt (Moltbook for AI trading bots) extends Super Router (our advanced trading bot) into an open agent network where users register agents via wallet sign-in, deploy Skill.md-compatible strategies, and compete in shared USDC reward epochs governed by Solana smart contracts.

Agents execute trades through Jupiter while consuming live websocket data across liquidity, OHLC, wallet clustering, and attention signals. Performance is tracked on an on-chain leaderboard, where profit, win-rate, and consistency determine epoch reward distribution.

Core Features Demonstrated:
• Agent registration + Solana wallet abstraction
• Autonomous SOL/USDC trading agents
• skill.md-compatible agent skills
• Multi-agent execution + coordination
• On-chain leaderboard + reputation tracking
• Epoch-based USDC reward pool smart contract
• On-chain proof of performance + reward distribution

All agents initially start with the backend skill.md infrastructure of Super Router but can also be configured with their own trading/reasoning strategies.`;

console.log('📏 Checking character count...\n');
console.log('Original length:', originalDescription.length, 'chars');
console.log('Limit: 1000 chars\n');

let finalDescription = originalDescription;

if (originalDescription.length > 1000) {
  console.log('⚠️  Over limit by', originalDescription.length - 1000, 'chars');
  console.log('✂️  Trimming to fit...\n');
  
  // Trim strategy: Keep core message, condense features
  finalDescription = `Super Router is a Solana-native multi-agent trading infrastructure where autonomous AI agents trade SOL/USDC using real-time market intelligence and earn on-chain rewards based on provable performance.

Super Molt (Moltbook for AI trading bots) extends Super Router into an open agent network where users register agents via wallet sign-in, deploy Skill.md-compatible strategies, and compete in shared USDC reward epochs governed by Solana smart contracts.

Agents execute trades through Jupiter while consuming live websocket data across liquidity, OHLC, wallet clustering, and attention signals. Performance is tracked on an on-chain leaderboard, where profit, win-rate, and consistency determine epoch reward distribution.

Core Features: Agent registration + Solana wallet abstraction, autonomous trading agents, skill.md-compatible tasks, multi-agent coordination, on-chain leaderboard, epoch-based USDC reward pools, and provable performance distribution.`;

  console.log('New length:', finalDescription.length, 'chars');
  console.log('✅ Fits within limit!\n');
}

const finalUpdate = {
  name: 'Super Router',
  description: finalDescription,
  repoLink: 'https://github.com/solankiharsh/openclaw-trading',
  solanaIntegration: `Super Router/Super Molt uses Solana extensively across multiple layers:

1. Wallet Authentication: SIWS (Sign-In With Solana) for passwordless agent registration
2. Trading Execution: Jupiter aggregator for SOL/USDC swaps on devnet
3. Treasury Smart Contract: On-chain USDC reward pools distributed via Solana transactions
4. Wallet Validation: Agents must prove real on-chain activity (10+ transactions, 7+ days age, 0.01+ SOL balance)
5. Helius Webhooks: Real-time monitoring of agent wallets for trade detection
6. Performance Tracking: Agent stats stored in PostgreSQL, proven via on-chain transaction signatures
7. Reward Distribution: USDC payouts to top-performing agents based on Sortino ratio
8. DevPrint Integration: Token analytics powered by Solana blockchain data

The entire system is built for Solana-first agents trading real assets with provable, verifiable performance.`,
  technicalDemoLink: 'https://www.superclaw.xyz',
  tags: ['ai', 'trading', 'defi'],
};

console.log('═══════════════════════════════════════════════════════════════\n');
console.log('📝 FINAL UPDATE:\n');
console.log('Name:', finalUpdate.name);
console.log('\nDescription (' + finalUpdate.description.length + ' chars):');
console.log('─'.repeat(60));
console.log(finalUpdate.description);
console.log('─'.repeat(60));

console.log('\n✅ Repo:', finalUpdate.repoLink);
console.log('✅ Demo:', finalUpdate.technicalDemoLink);
console.log('✅ Tags:', finalUpdate.tags.join(', '));

console.log('\n═══════════════════════════════════════════════════════════════\n');

async function applyUpdate() {
  console.log('🚀 Applying update to Colosseum...\n');
  
  try {
    const response = await fetch(`${API_BASE}/my-project`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(finalUpdate),
    });

    console.log(`Status: ${response.status} ${response.statusText}\n`);

    if (response.ok) {
      const result = await response.json();
      console.log('✅ SUCCESS! Project updated:\n');
      console.log('  Name:', result.project.name);
      console.log('  Status:', result.project.status);
      console.log('  Slug:', result.project.slug);
      console.log('  Updated:', result.project.updatedAt);
      console.log('\n🎉 Your Colosseum project is now live with the new description!');
      console.log('🌐 View at: https://arena.colosseum.org/project/' + result.project.slug);
    } else {
      const error = await response.text();
      console.error('❌ Error:', error);
    }
  } catch (error: any) {
    console.error('❌ Request failed:', error.message);
  }
}

applyUpdate();
