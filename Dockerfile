FROM node:12

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN /app/node_modules/.bin/tsc -p tsconfig.json

EXPOSE  5040

CMD ["node", "/app/build/src"]
