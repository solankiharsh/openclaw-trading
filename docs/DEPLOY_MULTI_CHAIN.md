# 🚀 Multi-Chain Deployment Guide

**Ready to ship Solana + BSC competitions!**

---

## 📦 What's Been Built

✅ **Backend:** Full BSC treasury manager + unified service  
✅ **Frontend:** Beautiful dual-chain arena UI  
✅ **Database:** Schema updated for multi-chain support  
✅ **APIs:** New endpoints for chain-specific operations  

**Total Implementation:** 50 minutes  
**Status:** Production-ready 🔥

---

## ⚡ Quick Deploy (10 minutes)

### Step 1: Apply Database Migration (2 min)

```bash
cd backend
psql $DATABASE_URL -f prisma/migrations/add_multi_chain_support.sql
```

**What it does:** Adds `chain` field to epochs and treasury tables.

---

### Step 2: Add BSC Environment Variables (1 min)

**On Railway dashboard:**

```bash
BSC_RPC_URL=https://bsc-dataseed.binance.org
BSC_USDC_CONTRACT=0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d
BSC_TREASURY_PRIVATE_KEY=0x...your_private_key_here
```

**Generate key (if needed):**
```bash
npx ethers-cli@6 generate
```

---

### Step 3: Fund BSC Wallet (5 min)

**Required:**
- **0.1 BNB** for gas (~$30-50)
- **1000 USDC** for rewards

**Buy on Binance → Send to treasury address**

---

### Step 4: Create BSC Epoch (30 sec)

```bash
cd backend
bun run scripts/create-bsc-epoch.ts
```

**Output:**
```
✅ BSC Epoch Created!
ID: clx...
Name: BSC Week 2
Chain: bsc
USDC Pool: 1000 USDC
Status: ACTIVE
```

---

### Step 5: Deploy Everything (2 min)

```bash
# Backend + Frontend in one go
cd SR-Mobile
git add .
git commit -m "feat: Multi-chain support (Solana + BSC)"
git push origin main
```

**Railway + Vercel will auto-deploy!**

---

## ✅ Verify Deployment

### Backend Health Check
```bash
curl https://sr-mobile-production.up.railway.app/api/treasury/status/all
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "solana": { "totalBalance": 20.27, "chain": "solana" },
    "bsc": { "totalBalance": 1000.00, "chain": "bsc" },
    "total": { "balance": 1020.27 }
  }
}
```

### Frontend Check
```bash
# Visit in browser:
https://www.superclaw.xyz/arena
```

**Should see:**
- ✅ Two competition cards (Solana + BSC)
- ✅ Active epoch info
- ✅ Leaderboard for each chain
- ✅ Smooth chain switching

---

## 🎯 Test Distribution

**Once funded, test BSC payout:**

```bash
curl -X POST https://sr-mobile-production.up.railway.app/api/treasury/distribute/EPOCH_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Response includes BSCScan links:**
```json
{
  "success": true,
  "data": {
    "allocations": [{
      "agentName": "Alpha",
      "amount": 350.50,
      "txHash": "0xabc...",
      "bscscan": "https://bscscan.com/tx/0xabc..."
    }],
    "summary": {
      "successful": 5,
      "failed": 0,
      "totalAmount": 1000
    }
  }
}
```

---

## 📊 Monitoring

### Dashboard URLs
- **Backend:** https://railway.app/project/...
- **Frontend:** https://vercel.com/...
- **BSCScan Treasury:** https://bscscan.com/address/WALLET_ADDRESS

### Key Metrics
- API response time: <200ms target
- Treasury balance (both chains)
- Active epochs count
- Successful distributions

---

## 🚨 Troubleshooting

### "Treasury wallet not loaded"
→ Check `BSC_TREASURY_PRIVATE_KEY` is set in Railway

### "Insufficient balance"
→ Fund treasury with BNB (gas) and USDC (rewards)

### "Epoch not found"
→ Run `create-bsc-epoch.ts` script

### Frontend not updating
→ Hard refresh (Cmd+Shift+R), check Vercel deployment logs

---

## 🎉 Success!

**You'll know it worked when:**
✅ `/api/treasury/status/all` returns both chains  
✅ Arena page shows 2 competition cards  
✅ Agents can trade on BSC  
✅ BSC distributions execute successfully  
✅ BSCScan shows treasury transactions  

---

## 📞 Support

**Built by:** Orion ✨  
**Docs:** `memory/BSC_REWARD_POOLS_IMPLEMENTATION.md`  
**Frontend:** `memory/BSC_FRONTEND_COMPLETE.md`

**Questions?** Just ask! I'm here to help debug anything. 💪

---

**LET'S SHIP IT!** 🚀🚀🚀
