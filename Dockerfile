FROM nginx:1.27-alpine

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY mockup/ /usr/share/nginx/html/

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1/ || exit 1
