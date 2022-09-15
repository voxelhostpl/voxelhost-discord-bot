FROM node:18-alpine AS production_dependencies

COPY package.json yarn.lock ./
RUN yarn install --production --frozen-lockfile



FROM alpine:3 AS production

RUN apk add --no-cache nodejs tini

VOLUME /data
WORKDIR /app

ENV NODE_ENV=production
EXPOSE 80/tcp
ENTRYPOINT [ "/sbin/tini", "--" ]
CMD [ "node", "src/main.js" ]

COPY src ./src
COPY utility-commands ./utility-commands
COPY .env .
COPY --from=production_dependencies node_modules node_modules