# PowerHoof Nushell Container

FROM ghcr.io/nushell/nushell:latest

# Install additional tools for Azure operations
RUN apt-get update && apt-get install -y \
    curl \
    jq \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Azure CLI for az resource operations
RUN curl -sL https://aka.ms/InstallAzureCLIDeb | bash

# Create workspace directory
WORKDIR /workspace

# Copy PowerHoof custom commands
COPY nushell/ /root/.config/nushell/

# Health check script
COPY scripts/health.sh /usr/local/bin/health.sh
RUN chmod +x /usr/local/bin/health.sh

# Default entrypoint - keep container alive for session pool
ENTRYPOINT ["nu"]
CMD ["-c", "while true { sleep 1hr }"]
