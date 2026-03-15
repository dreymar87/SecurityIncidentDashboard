FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY src ./src

RUN mkdir -p /tmp/sid-imports

EXPOSE 4000

CMD ["sh", "-c", "node -e \"const env=process.env.NODE_ENV||'development';const knex=require('knex')(require('./src/db/knexfile.js')[env]);knex.migrate.latest().then(()=>{console.log('Migrations done');knex.destroy();})\" && node src/index.js"]
