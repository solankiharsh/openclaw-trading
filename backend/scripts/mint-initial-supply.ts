/**
 * Mint initial SMOLT token supply to treasury
 * Since initialize() was called during deployment, we'll use mint() instead
 */

import {
    createPublicClient,
    createWalletClient,
    http,
    formatEther,
    parseEther,
    type Address,
    type Hex,
} from 'viem';
import { bscTestnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as fs from 'fs';
import * as path from 'path';

const BSC_TESTNET_RPC = 'https://data-seed-prebsc-1-s1.binance.org:8545/';
const ENV_PATH = path.join(import.meta.dir, '..', '.env');
const COMPILED_PATH = path.join(import.meta.dir, '..', 'compiled', 'OpenClawRewardToken.json');

// Load compiled contract
const compiled = JSON.parse(fs.readFileSync(COMPILED_PATH, 'utf-8'));

function getClient() {
    return createPublicClient({
        chain: bscTestnet,
        transport: http(BSC_TESTNET_RPC),
    });
}

function getWalletClient(privateKey: Hex) {
    const account = privateKeyToAccount(privateKey);
    return createWalletClient({
        account,
        chain: bscTestnet,
        transport: http(BSC_TESTNET_RPC),
    });
}

function readEnvKey(key: string): string | null {
    try {
        const content = fs.readFileSync(ENV_PATH, 'utf-8');
        for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (trimmed.startsWith('#')) continue;
            const [k, ...rest] = trimmed.split('=');
            if (k?.trim() === key) return rest.join('=').trim();
        }
    } catch { }
    return null;
}

// Main
const privateKey = readEnvKey('BSC_TREASURY_PRIVATE_KEY');
const contractAddress = readEnvKey('BSC_REWARD_TOKEN_ADDRESS');

if (!privateKey) {
    console.error('❌ BSC_TREASURY_PRIVATE_KEY not found in .env');
    process.exit(1);
}

if (!contractAddress) {
    console.error('❌ BSC_REWARD_TOKEN_ADDRESS not found in .env');
    process.exit(1);
}

const account = privateKeyToAccount(privateKey as Hex);
const client = getClient();
const wallet = getWalletClient(privateKey as Hex);

console.log('═══════════════════════════════════════════════════════');
console.log('   MINTING INITIAL SMOLT SUPPLY');
console.log('═══════════════════════════════════════════════════════\n');

console.log('📝 Contract:', contractAddress);
console.log('💼 Treasury:', account.address);
console.log('');

// Check current supply
try {
    const [totalSupply, balance, owner] = await Promise.all([
        client.readContract({
            address: contractAddress as Address,
            abi: compiled.abi,
            functionName: 'totalSupply',
        }),
        client.readContract({
            address: contractAddress as Address,
            abi: compiled.abi,
            functionName: 'balanceOf',
            args: [account.address],
        }),
        client.readContract({
            address: contractAddress as Address,
            abi: compiled.abi,
            functionName: 'owner',
        }),
    ]);

    console.log('📊 CURRENT STATE:');
    console.log(`   Total Supply:     ${formatEther(totalSupply as bigint)} SMOLT`);
    console.log(`   Treasury Balance: ${formatEther(balance as bigint)} SMOLT`);
    console.log(`   Contract Owner:   ${owner}\n`);

    if (totalSupply > 0n) {
        console.log('✅ Token already has supply!');
        console.log(`\n🔗 Explorer: https://testnet.bscscan.com/address/${contractAddress}`);
        process.exit(0);
    }

    // Mint 1,000,000 SMOLT
    const mintAmount = parseEther('1000000');
    console.log('🪙 Minting 1,000,000 SMOLT to treasury...\n');

    const hash = await wallet.writeContract({
        address: contractAddress as Address,
        abi: compiled.abi,
        functionName: 'mint',
        args: [account.address, mintAmount],
    });

    console.log('✓ Mint TX submitted:', hash);
    console.log('⏳ Waiting for confirmation...\n');

    const receipt = await client.waitForTransactionReceipt({ hash });

    if (receipt.status === 'success') {
        console.log('╔════════════════════════════════════════════════════════════════╗');
        console.log('║              MINTING SUCCESSFUL! 🎉                            ║');
        console.log('╚════════════════════════════════════════════════════════════════╝\n');

        // Verify the mint
        const [newTotalSupply, newBalance] = await Promise.all([
            client.readContract({
                address: contractAddress as Address,
                abi: compiled.abi,
                functionName: 'totalSupply',
            }),
            client.readContract({
                address: contractAddress as Address,
                abi: compiled.abi,
                functionName: 'balanceOf',
                args: [account.address],
            }),
        ]);

        console.log('📊 NEW STATE:');
        console.log(`   Total Supply:     ${formatEther(newTotalSupply as bigint)} SMOLT`);
        console.log(`   Treasury Balance: ${formatEther(newBalance as bigint)} SMOLT\n`);

        console.log('🔗 LINKS:');
        console.log(`   Contract: https://testnet.bscscan.com/address/${contractAddress}`);
        console.log(`   TX:       https://testnet.bscscan.com/tx/${hash}\n`);

        console.log('✨ Your BSC treasury is now funded and ready to distribute rewards!');
    } else {
        console.error('❌ Minting failed');
        process.exit(1);
    }
} catch (error: any) {
    console.error('❌ Error:', error.message || error);

    if (error.message?.includes('Ownable: caller is not the owner')) {
        console.error('\n⚠️  The treasury wallet is not the owner of the contract.');
        console.error('   Only the owner can mint tokens.');
    }

    process.exit(1);
}
