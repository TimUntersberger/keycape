FROM node:13
WORKDIR /app
COPY package.json .
COPY package-lock.json .
RUN npm ci
COPY src ./src
COPY migrations ./migrations
COPY tsconfig.json tsconfig.json 
RUN npm run build
RUN touch config.yaml
CMD node dist/src/index.js
