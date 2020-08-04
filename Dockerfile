FROM node:12

WORKDIR /app

COPY  package*.json /app

RUN npm install

COPY  /app

RUN npm run start

EXPOSE  5040

