# Base Image: Python + Node.js
# Using python:3.10-slim-bookworm as a stable base
FROM python:3.10-slim-bookworm

# Install system dependencies for OpenCascade (OCP), build123d, and Node.js
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gnupg \
    build-essential \
    libgl1-mesa-glx \
    libglu1-mesa \
    libxrender1 \
    libxext6 \
    libx11-6 \
    libfontconfig1 \
    libdbus-1-3 \
    libxkbcommon-x11-0 \
    libxcb-icccm4 \
    libxcb-image0 \
    libxcb-keysyms1 \
    libxcb-randr0 \
    libxcb-render-util0 \
    libxcb-xinerama0 \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20 (required for the pi agent bridge)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Set up working directory
WORKDIR /app

# Copy Python requirements first for caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the local cad_engine library so it is pre-installed in the environment
COPY cad_engine /app/cad_engine
RUN pip install -e /app/cad_engine || true
# Note: Since cad_engine doesn't have a setup.py yet, we will add one, 
# or just ensure it's in the PYTHONPATH.

# Set PYTHONPATH to include /app so "import cad_engine" works natively
ENV PYTHONPATH="/app:${PYTHONPATH}"

# Install the agent bridge dependencies
# Assuming we will have a package.json in the bridge folder
COPY infrastructure/agent/bridge /app/bridge
WORKDIR /app/bridge
RUN npm install

# Set the entrypoint to run the bridge
ENTRYPOINT ["node", "index.js"]
