# Scheduled scrapers/processors (formerly Trigger.dev tasks). Build context is
# the repo root: `docker build -f jobs/Dockerfile .`
FROM node:24-slim

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl tini \
    && rm -rf /var/lib/apt/lists/*

ARG SUPERCRONIC_VERSION=v0.2.33
RUN curl -fsSL "https://github.com/aptible/supercronic/releases/download/${SUPERCRONIC_VERSION}/supercronic-linux-amd64" -o /usr/local/bin/supercronic \
    && echo "71b0d58cc53f6bd72cf2f293e09e294b79c666d8  /usr/local/bin/supercronic" | sha1sum -c - \
    && chmod +x /usr/local/bin/supercronic

RUN npm install --global pnpm@9.13.1

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# consts.ts reads misc/*.pem relative to the working directory.
COPY consts.ts ./
COPY misc ./misc
COPY jobs ./jobs

ENV NODE_ENV=production
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["/usr/local/bin/supercronic", "/app/jobs/crontab"]
