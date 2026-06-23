FROM nginx:alpine

# Remove a página padrão do Nginx
RUN rm -rf /usr/share/nginx/html/*

# Copia os arquivos do projeto para o Nginx
COPY . /usr/share/nginx/html/

# Renomeia o arquivo principal para index.html para abrir direto
RUN mv /usr/share/nginx/html/landing_page_do_lead_ao_lucro.html /usr/share/nginx/html/index.html

EXPOSE 80
