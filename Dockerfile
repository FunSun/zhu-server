FROM blacktop/elasticsearch:6.4

RUN /usr/share/elasticsearch/bin/elasticsearch-plugin install --batch https://github.com/medcl/elasticsearch-analysis-ik/releases/download/v6.4.3/elasticsearch-analysis-ik-6.4.3.zip

RUN apk add --no-cache nodejs npm supervisor

ADD --chown=elasticsearch:elasticsearch docker/elastic/elasticsearch.yml /usr/share/elasticsearch/config/elasticsearch.yml
ADD --chown=elasticsearch:elasticsearch docker/elastic/jvm.options /usr/share/elasticsearch/config/jvm.options
ADD --chown=elasticsearch:elasticsearch docker/supervisor/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

ADD package.json /app/package.json
RUN cd /app && npm --registry=https://registry.npm.taobao.org install --production
ADD ./build /app
ADD docker/ui /app/ui

VOLUME ["/usr/share/elasticsearch/data"]

EXPOSE 9200 8070

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
