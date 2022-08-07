FROM node:16
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY ./package.json ./yarn.lock /usr/src/app/
RUN apt-get -y update -qq
RUN apt-get -y install chromium
RUN yarn install && yarn cache clean
COPY ./ /usr/src/app
ENV NODE_ENV production
ENV PORT 80
EXPOSE 80
RUN npm run setup
CMD [ "npm", "run", "start" ]
