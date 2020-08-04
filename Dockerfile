FROM node:12

WORKDIR /app

COPY  ./ /app

RUN npm install

RUN /app/node_modules/.bin/tsc -p tsconfig.json

RUN node /app/build/src

EXPOSE  5040

