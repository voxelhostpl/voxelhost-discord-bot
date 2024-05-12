FROM node:20-alpine AS builder

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .

RUN yarn build



FROM node:20-alpine AS production_dependencies

COPY package.json yarn.lock ./
RUN yarn install --production --frozen-lockfile



FROM alpine:3 AS production

RUN apk add --no-cache nodejs tini

VOLUME /data
WORKDIR /app

ENV NODE_ENV=production
EXPOSE 80/tcp
ENTRYPOINT [ "/sbin/tini", "--" ]
CMD [ "node", "dist/main.js" ]

COPY --from=builder dist/src dist
COPY --from=builder dist/migrations migrations
COPY utility-commands utility-commands
COPY .env .
COPY --from=production_dependencies node_modules node_modules