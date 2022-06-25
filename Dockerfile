ARG BUILD_NODE_VERSION=16-alpine
ARG ALPINE_VERSION=3


FROM node:$BUILD_NODE_VERSION AS production_dependencies

COPY package.json yarn.lock ./
RUN yarn install --production --frozen-lockfile



FROM alpine:$ALPINE_VERSION AS production

RUN apk add --no-cache nodejs tini

VOLUME /data
WORKDIR /app

ENV NODE_ENV=production
EXPOSE 80/tcp
ENTRYPOINT [ "/sbin/tini", "--" ]
CMD [ "node", "src/main.js" ]

COPY src ./src
COPY .env .
COPY --from=production_dependencies node_modules node_modules