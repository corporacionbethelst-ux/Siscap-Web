FROM node:20-alpine

WORKDIR /app

# Copiar package.json primero (aprovecha la caché de Docker)
COPY package.json package-lock.json* ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Exponer el puerto de Vite
EXPOSE 5173

# Comando para desarrollo con hot-reload
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]