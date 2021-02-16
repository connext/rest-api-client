FROM node:lts-alpine3.12 AS builder
RUN apk add --no-cache git bash python3 make g++ python2
WORKDIR /app
COPY . .
RUN  npm install && npm run build && rm -rf node_modules


FROM node:lts-alpine3.12
WORKDIR /app
COPY --from=builder /app /app
RUN npm install --production

EXPOSE  5040
CMD ["npm", "run", "prod"]
