# Simple Deployment Guide

## Quick Setup

### 1. On Your VM

```bash
# Create directory
mkdir -p /opt/rajaji-server
cd /opt/rajaji-server

# Create .env file (only file you need to create manually)
cat > .env << EOF
NODE_ENV=production
PORT=4000
TZ=Asia/Kolkata
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
BIDDING_DURATION=25
BREAK_DURATION=5
GAME_CREATION_INTERVAL=30
EOF
```

## Environment Variables

### Required Variables

These environment variables **must** be set in your `.env` file:

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/rajaji` or `mongodb+srv://user:pass@cluster.mongodb.net/dbname` |
| `JWT_SECRET` | Secret key for JWT token signing | Generate a strong random string (min 32 characters) |

### Optional Variables (with defaults)

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `NODE_ENV` | Node environment | `production` | `production`, `development` |
| `PORT` | Server port | `4000` | `4000` |
| `TZ` | Timezone | `Asia/Kolkata` | `Asia/Kolkata` |
| `BIDDING_DURATION` | Bidding phase duration (minutes) | `25` | `8`, `10`, `25` |
| `BREAK_DURATION` | Break phase duration (minutes) | `5` | `2`, `5`, `10` |
| `GAME_CREATION_INTERVAL` | Game creation interval (minutes) | `30` | `10`, `15`, `30` |

**Note:** `GAME_CREATION_INTERVAL` should equal `BIDDING_DURATION + BREAK_DURATION`

### CORS Configuration (Optional)

These are optional but recommended if you have specific frontend URLs:

| Variable | Description | Example |
|----------|-------------|---------|
| `DASHBOARD_URL` | Admin dashboard URL | `https://admin.rajaji.club` |
| `RAJAJI_CLIENT_URL` | Main client URL | `https://rajaji.club` |
| `RAJAJI_CLIENT_URL1` | Additional client URL | `https://rajaji-three.vercel.app` |
| `FRONTEND_URL` | Frontend URL (for Socket.IO) | `https://rajaji.club` |

### Example .env File

```bash
# Server Configuration
NODE_ENV=production
PORT=4000
TZ=Asia/Kolkata

# Database (REQUIRED)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rajaji?retryWrites=true&w=majority

# Security (REQUIRED)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long

# Game Configuration
BIDDING_DURATION=25
BREAK_DURATION=5
GAME_CREATION_INTERVAL=30

# CORS (Optional)
DASHBOARD_URL=https://admin.rajaji.club
RAJAJI_CLIENT_URL=https://rajaji.club
RAJAJI_CLIENT_URL1=https://rajaji-three.vercel.app
FRONTEND_URL=https://rajaji.club
```

### Generating JWT_SECRET

Generate a secure JWT secret:

```bash
# Using OpenSSL
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

That's it! The `.docker/docker-compose.yml` and `.docker/Caddyfile` will be created automatically on first deployment.

### 2. Update Domain in Caddyfile

After first deployment, edit `.docker/Caddyfile` to change `api.rajaji.club` to your domain:

```bash
nano /opt/rajaji-server/.docker/Caddyfile
# Change api.rajaji.club to your domain
cd /opt/rajaji-server/.docker
docker-compose restart caddy
```

### 3. DNS Setup

Point your domain's A record to your VM's IP address.

### 4. GitHub Secrets

Go to your repository → **Settings → Secrets and variables → Actions** and add the following secrets:

#### Required Secrets

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `VM_HOST` | Your VM's IP address or domain | Your VM provider dashboard or `curl ifconfig.me` on the VM |
| `VM_USERNAME` | SSH username for your VM | Usually `root` or your VM provider's default user |
| `VM_SSH_KEY` | Private SSH key for authentication | Generate with `ssh-keygen` or use existing key |

#### Optional Secrets

| Secret Name | Description | When Needed |
|-------------|-------------|-------------|
| `GHCR_PAT` | GitHub Personal Access Token for GHCR | Only if `GITHUB_TOKEN` doesn't have sufficient permissions (see below) |

#### About GITHUB_TOKEN and GHCR_PAT

**`GITHUB_TOKEN` is automatically provided** by GitHub Actions and works for most cases:
- Pushing Docker images to GHCR (if package visibility allows)
- Pulling images on the VM (if package is public or repository has access)

**When you need `GHCR_PAT` (Personal Access Token):**
- If `GITHUB_TOKEN` doesn't have sufficient permissions to push/pull packages
- If your GHCR package is private and needs explicit authentication
- If you encounter authentication errors during deployment

**To create a GHCR_PAT:**
1. Go to GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. Click **Generate new token (classic)**
3. Select scopes: `write:packages` and `read:packages`
4. Copy the token and add it as `GHCR_PAT` in GitHub Secrets

**Note:** The workflow will use `GHCR_PAT` if available, otherwise it falls back to `GITHUB_TOKEN`. You can start with `GITHUB_TOKEN` and add `GHCR_PAT` only if you encounter permission issues.

#### Setting Up SSH Key

If you don't have an SSH key pair:

```bash
# Generate SSH key pair (on your local machine)
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/rajaji_deploy

# Copy public key to VM
ssh-copy-id -i ~/.ssh/rajaji_deploy.pub root@YOUR_VM_IP

# Or manually add to VM
cat ~/.ssh/rajaji_deploy.pub
# Then on VM: echo "YOUR_PUBLIC_KEY" >> ~/.ssh/authorized_keys
```

**Important:** Add the **private key** (`~/.ssh/rajaji_deploy`) to GitHub Secrets, not the public key.

#### Adding Secrets to GitHub

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret:
   - **Name:** `VM_HOST` → **Value:** `192.168.1.100` (your VM IP)
   - **Name:** `VM_USERNAME` → **Value:** `root` (or your SSH user)
   - **Name:** `VM_SSH_KEY` → **Value:** (paste your private SSH key content)

**Example SSH Key Format:**
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABlwAAAAdzc2gtcn
...
-----END OPENSSH PRIVATE KEY-----
```

### 5. Deploy

Push to `main` branch - deployment happens automatically.

Or manually:
```bash
cd /opt/rajaji-server/.docker
docker-compose pull
docker-compose up -d
```

## Commands

All commands should be run from `.docker` directory:

```bash
cd /opt/rajaji-server/.docker

# View logs
docker-compose logs -f
docker-compose logs -f server
docker-compose logs -f caddy

# Restart
docker-compose restart
docker-compose restart server
docker-compose restart caddy

# Stop
docker-compose down

# Start
docker-compose up -d

# Reload Caddy config
docker-compose exec caddy caddy reload --config /etc/caddy/Caddyfile
```

## Socket.IO Support

Socket.IO works automatically through Caddy. Caddy handles WebSocket upgrades for Socket.IO connections. No additional configuration needed.
