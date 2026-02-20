# Guia de Deploy: Ubuntu + PostgreSQL 🚀

Siga este passo a passo para migrar o sistema do seu ambiente local para o servidor de produção.

## 0. Atualizando o Código no GitHub (Ambiente Local)

Antes de ir para o servidor, certifique-se de que suas alterações locais estão no GitHub:

```bash
# Salvar alterações
git add .
git commit -m "Ajustes de layout e suporte a observações"

# Enviar para o GitHub
git push origin master
```

## 1. Instalação de Dependências (Servidor)

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js (v18+) e npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PostgreSQL
sudo apt install postgresql postgresql-contrib -y
```

## 2. Configuração do Banco de Dados (PostgreSQL)

```bash
# Acessar o postgres
sudo -u postgres psql

# Executar dentro do terminal do PostgreSQL:
CREATE DATABASE nome_do_banco;
CREATE USER usuario_db WITH PASSWORD 'sua_senha_forte';
GRANT ALL PRIVILEGES ON DATABASE nome_do_banco TO usuario_db;
\q
```

## 3. Preparação do Projeto

No servidor, clone o repositório (na primeira vez) ou baixe as atualizações:

```bash
# Se já tiver o projeto no servidor:
git pull origin master

# Instalar dependências
npm install
```
# Configurar variáveis de ambiente
cp .env.example .env # Se existir, ou crie um novo
nano .env
```

**Configurações CRÍTICAS no `.env` do servidor:**
```env
DB_TYPE="postgres"
DATABASE_URL="postgresql://usuario_db:sua_senha_forte@localhost:5432/nome_do_banco"
JWT_SECRET="sua_chave_secreta_aqui"
# ... demais configurações de path para fotos e excel
```

## 4. Deploy e Migração

```bash
# O build ja executa o script de troca para Postgres e gera o Prisma Client
npm run build

# Criar as tabelas no PostgreSQL
npx prisma db push

# Criar o usuário administrador 'willavila'
node scripts/setup-admin.js
```

## 5. Execução em Produção (Recomendado: PM2)

```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Iniciar o sistema
pm2 start npm --name "time-de-campo" -- start

# Salvar para iniciar no boot do servidor
pm2 save
pm2 startup
```

---
*Escrito por Antigravity para Will Avila.*
