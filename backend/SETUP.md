# Backend Setup Guide for Collaborators

## Prerequisites
- Node.js v14+ installed
- MongoDB Atlas account access (ask project lead)

## Setup Steps

### 1. Environment Variables
```bash
cp .env.example .env
```
Then edit `.env` with the actual MongoDB credentials from the project lead.

### 2. Fix MongoDB Connection Issues

**If you see: "SRV DNS lookup failed"**

This means your IP isn't whitelisted in MongoDB Atlas or your network blocks DNS lookups.

#### Option A: Add Your IP to MongoDB Atlas (Recommended)
1. Go to [MongoDB Atlas Dashboard](https://cloud.mongodb.com)
2. Select the project → **Network Access**
3. Click **Add IP Address**
4. Choose:
   - **Current IP** (if you have a static IP)
   - **0.0.0.0/0** (allows any IP, less secure—only for dev)
5. Click **Confirm**
6. Try connecting again: `npm start`

#### Option B: Use Direct Connection URI (Workaround)
If SRV lookups fail, ask the project lead for the direct URI format:
```
mongodb+srv://user:pass@cluster0.evoccgn.mongodb.net/...
```
→ Convert to:
```
mongodb://user:pass@node1.mongodb.net:27017,node2.mongodb.net:27017,node3.mongodb.net:27017/SignCast
```
Then update `MONGO_URI` in `.env`.

### 3. Install Dependencies & Run
```bash
npm install
npm start
```

You should see: `Connected to MongoDB`

## Troubleshooting

| Error | Solution |
|-------|----------|
| "querySrv ECONNREFUSED" | IP not whitelisted—add it to Network Access in Atlas |
| "MONGO_URI is not set" | Copy `.env.example` to `.env` and add credentials |
| Timeout errors | Check firewall settings; may need to use direct URI instead of SRV |

## .env Security
⚠️ **Never commit `.env` to git!** It contains sensitive credentials.

- `.env` is in `.gitignore` 
- Use `.env.example` for sharing template only
- Ask project lead privately for real credentials
