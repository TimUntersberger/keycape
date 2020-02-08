FROM node:13
WORKDIR app
COPY package.json .
COPY yarn.lock .
RUN yarn install
COPY src ./src
COPY migrations ./migrations
COPY tsconfig.json tsconfig.json 
RUN yarn build
RUN touch config.yaml
CMD node dist/src/index.js
