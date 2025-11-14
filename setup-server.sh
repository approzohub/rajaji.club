#!/bin/bash

# ============================================================================
# Server Setup Script for Rajaji Club
# ============================================================================
#
# This script automates the complete server setup process:
#
# STEPS PERFORMED:
# 1. Prerequisites Check
#    - Verifies git, node, npm, and pm2 are installed
#    - Prompts for Git repository URL if not provided
#
# 2. Repository Clone
#    - Clones the repository to a temporary directory
#    - Removes existing temporary clone directory if present
#
# 3. Move Content to public_html Directories
#    - Moves client/ content to applications/yaeydqfjnw/public_html/
#    - Moves server/ content to applications/frzeqenypp/public_html/
#    - Moves admin-ui/ content to applications/pqcqxgqgun/public_html/
#    - DELETES ALL EXISTING CONTENT in each public_html directory before moving
#    - PRESERVES .env* files (does not delete .env, .env.local, etc.)
#    - Creates parent directories if they don't exist
#
# 4. Install Dependencies and Build
#    - Installs npm dependencies for server, admin-ui, and client
#    - Builds all three projects
#
# 5. Setup PM2 Processes
#    - Stops and removes existing PM2 processes (if any)
#    - Starts server with PM2 (playwin-backend)
#    - Starts admin-ui with PM2 (admin-dashboard)
#    - Starts client with PM2 (PlayInWin)
#    - Updates client PM2 config with correct working directory
#    - Saves PM2 configuration
#
# 6. Final Status
#    - Displays PM2 status
#    - Shows summary of running applications
#
# IMPORTANT NOTES:
# - This script DELETES all existing content in public_html directories
# - .env* files are PRESERVED and will NOT be deleted
# - Environment variables (.env files) must be created manually in each project
# - The script expects .env files to already exist or be created manually
#
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="${REPO_URL:-}"  # Set via environment variable or prompt
CLIENT_DIR="applications/yaeydqfjnw/public_html"
SERVER_DIR="applications/frzeqenypp/public_html"
ADMIN_UI_DIR="applications/pqcqxgqgun/public_html"
TEMP_CLONE_DIR="rajaji-club-temp"

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 is not installed. Please install it first."
        exit 1
    fi
}

# Check required commands
print_info "Checking required commands..."
check_command git
check_command node
check_command npm
check_command pm2

# Get repository URL if not set
if [ -z "$REPO_URL" ]; then
    read -p "Enter Git repository URL: " REPO_URL
    if [ -z "$REPO_URL" ]; then
        print_error "Repository URL is required"
        exit 1
    fi
fi

print_info "Repository URL: $REPO_URL"

# Step 1: Clone repository
print_info "Step 1: Cloning repository..."
if [ -d "$TEMP_CLONE_DIR" ]; then
    print_warn "Temporary clone directory exists. Removing it..."
    rm -rf "$TEMP_CLONE_DIR"
fi

git clone "$REPO_URL" "$TEMP_CLONE_DIR"
cd "$TEMP_CLONE_DIR"

# Step 2: Move folders to specified locations
print_info "Step 2: Moving folders to specified locations..."

# Function to clear and move content to public_html
move_to_public_html() {
    local SOURCE_DIR=$1
    local TARGET_DIR=$2
    local PROJECT_NAME=$3
    
    print_info "Moving $PROJECT_NAME to $TARGET_DIR..."
    
    # Create parent directory if it doesn't exist
    local PARENT_DIR=$(dirname "../$TARGET_DIR")
    mkdir -p "../$PARENT_DIR"
    
    # Create public_html directory if it doesn't exist
    mkdir -p "../$TARGET_DIR"
    
    # Delete all content in public_html if it exists and has content
    # BUT preserve .env* files
    if [ -d "../$TARGET_DIR" ] && [ "$(ls -A ../$TARGET_DIR 2>/dev/null)" ]; then
        print_warn "$TARGET_DIR already has content. Deleting existing content (preserving .env* files)..."
        
        # Delete all files and directories except .env* files
        find "../$TARGET_DIR" -mindepth 1 -maxdepth 1 ! -name '.env*' -exec rm -rf {} +
        
        print_info "Existing content deleted from $TARGET_DIR (except .env* files)"
    fi
    
    # Copy all content from source to public_html
    if [ -d "$SOURCE_DIR" ]; then
        cp -r "$SOURCE_DIR"/* "../$TARGET_DIR/" 2>/dev/null || true
        cp -r "$SOURCE_DIR"/.[!.]* "../$TARGET_DIR/" 2>/dev/null || true  # Copy hidden files
        print_info "$PROJECT_NAME content moved to $TARGET_DIR"
    else
        print_error "$SOURCE_DIR folder not found in repository"
        exit 1
    fi
}

# Move client to yaeydqfjnw/public_html
if [ -d "client" ]; then
    move_to_public_html "client" "$CLIENT_DIR" "Client"
else
    print_error "Client folder not found in repository"
    exit 1
fi

# Move server to frzeqenypp/public_html
if [ -d "server" ]; then
    move_to_public_html "server" "$SERVER_DIR" "Server"
else
    print_error "Server folder not found in repository"
    exit 1
fi

# Move admin-ui to pqcqxgqgun/public_html
if [ -d "admin-ui" ]; then
    move_to_public_html "admin-ui" "$ADMIN_UI_DIR" "Admin-UI"
else
    print_error "Admin-ui folder not found in repository"
    exit 1
fi

# Clean up temporary clone directory
cd ..
rm -rf "$TEMP_CLONE_DIR"
print_info "Temporary clone directory removed"

# Step 3: Install dependencies and build
print_info "Step 3: Installing dependencies and building projects..."

# Build Server
print_info "Building server..."
cd "$SERVER_DIR"
if [ ! -f ".env" ]; then
    print_warn ".env file not found in server directory. Please create it manually."
fi
npm install
npm run build
print_info "Server build completed"
cd ..

# Build Admin-UI
print_info "Building admin-ui..."
cd "$ADMIN_UI_DIR"
npm install
npm run build
print_info "Admin-ui build completed"
cd ..

# Build Client
print_info "Building client..."
cd "$CLIENT_DIR"
if [ ! -f ".env.local" ] && [ ! -f ".env" ]; then
    print_warn ".env file not found in client directory. Please create it manually."
fi
npm install
npm run build
print_info "Client build completed"
cd ..

# Step 4: Setup PM2 processes
print_info "Step 4: Setting up PM2 processes..."

# Stop existing PM2 processes if they exist
print_info "Stopping existing PM2 processes (if any)..."
pm2 stop playwin-backend 2>/dev/null || true
pm2 stop admin-dashboard 2>/dev/null || true
pm2 stop PlayInWin 2>/dev/null || true
pm2 delete playwin-backend 2>/dev/null || true
pm2 delete admin-dashboard 2>/dev/null || true
pm2 delete PlayInWin 2>/dev/null || true

# Start Server with PM2
print_info "Starting server with PM2..."
cd "$SERVER_DIR"
# Update ecosystem.config.js cwd if needed
pm2 start ecosystem.config.js --env production || {
    print_error "Failed to start server with PM2"
    exit 1
}
print_info "Server started with PM2"
cd ..

# Start Admin-UI with PM2
print_info "Starting admin-ui with PM2..."
cd "$ADMIN_UI_DIR"
pm2 start ecosystem.config.cjs || {
    print_error "Failed to start admin-ui with PM2"
    exit 1
}
print_info "Admin-ui started with PM2"
cd ..

# Start Client with PM2
print_info "Starting client with PM2..."
cd "$CLIENT_DIR"
# Update ecosystem.config.cjs with correct path
if [ -f "ecosystem.config.cjs" ]; then
    # Update the cwd in ecosystem.config.cjs to current absolute path
    CURRENT_DIR=$(pwd)
    sed -i "s|cwd:.*|cwd: '$CURRENT_DIR',|" ecosystem.config.cjs
fi
pm2 start ecosystem.config.cjs --env production || {
    print_error "Failed to start client with PM2"
    exit 1
}
print_info "Client started with PM2"
cd ..

# Step 5: Save PM2 configuration
print_info "Step 5: Saving PM2 configuration..."
pm2 save

# Step 6: Show PM2 status
print_info "Step 6: PM2 Status:"
pm2 status

print_info ""
print_info "=========================================="
print_info "Setup completed successfully!"
print_info "=========================================="
print_info ""
print_info "Applications are running with PM2:"
print_info "  - Server: playwin-backend (in $SERVER_DIR)"
print_info "  - Admin-UI: admin-dashboard (in $ADMIN_UI_DIR)"
print_info "  - Client: PlayInWin (in $CLIENT_DIR)"
print_info ""
print_info "Useful PM2 commands:"
print_info "  pm2 status          - Check status"
print_info "  pm2 logs            - View logs"
print_info "  pm2 monit           - Monitor processes"
print_info "  pm2 restart <name>  - Restart a process"
print_info "  pm2 stop <name>     - Stop a process"
print_info ""

