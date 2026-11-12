FROM node:22-alpine
WORKDIR /app
COPY package.json server.mjs ./
COPY public ./public
RUN node --check server.mjs && node --check public/app.js && node --check public/experience.js && node --check public/motion.js
ENV NODE_ENV=production
ENV PORT=3000
USER node
EXPOSE 3000
CMD ["node", "server.mjs"]
