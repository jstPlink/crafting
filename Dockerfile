FROM nginx:1.27-alpine

ARG BUILD_VERSION=dev
ARG BUILD_SHA=local
ARG BUILD_DATE=unknown

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY mockup/ /usr/share/nginx/html/

# read by the mockup to show the build number in the UI
RUN printf '{"version":"%s","sha":"%s","date":"%s"}\n' "$BUILD_VERSION" "$BUILD_SHA" "$BUILD_DATE" \
      > /usr/share/nginx/html/version.json

LABEL org.opencontainers.image.version="$BUILD_VERSION" \
      org.opencontainers.image.revision="$BUILD_SHA" \
      org.opencontainers.image.source="https://github.com/jstPlink/crafting"

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1/ || exit 1
