# Estrutura de pastas

```
meu-projeto/
│
├── package.json
├── database.db                 # opcional: será criado automaticamente se não existir
├── server.js                   # ponto de entrada
├── public/
│   ├── index.html
│   └── script.js
└── src/
    ├── app.js
    ├── config/
    │   └── db.js
    ├── middlewares/
    │   └── errorHandler.js
    └── modules/
        └── users/
            ├── user.routes.js
            ├── user.controller.js
            ├── user.service.js
            └── user.repository.js
```

---

## package.json
```json
{
  "name": "meu-projeto",
  "version": "1.0.0",
  "type": "module",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.19.2",
    "sqlite3": "^5.1.7"
  },
  "devDependencies": {
    "nodemon": "^3.1.0"
  }
}
```

> Obs.: usando `type: module` para permitir `import`/`export`. Se preferir `require`, remova esse campo e ajuste os arquivos.

---

## server.js
```js
import { createServer } from 'http';
import app from './src/app.js';

const PORT = process.env.PORT || 3000;
const server = createServer(app);

server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
```

---

## src/app.js
```js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import usersRouter from './modules/users/user.routes.js';
import errorHandler from './middlewares/errorHandler.js';
import './config/db.js'; // inicializa banco e migrations

const app = express();

// util para resolver __dirname em ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());

// arquivos estáticos (pasta public na raiz do projeto)
app.use(express.static(path.resolve(__dirname, '../public')));

// healthcheck
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// rotas de domínio
app.use('/api/users', usersRouter);

// 404 genérico para API
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// middleware de erro
app.use(errorHandler);

export default app;
```

---

## src/config/db.js
```js
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// cria/abre o arquivo .db na raiz do projeto
const dbPath = path.resolve(__dirname, '../../..', 'database.db');

sqlite3.verbose();
export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Erro ao abrir o SQLite:', err.message);
  } else {
    console.log('✅ SQLite conectado em', dbPath);
  }
});

// Cria tabela e dados de seed
const migrate = () => {
  db.serialize(() => {
    db.run(
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    );

    db.get('SELECT COUNT(*) AS total FROM users', (err, row) => {
      if (err) {
        console.error('Erro ao contar users:', err.message);
        return;
      }
      if (row.total === 0) {
        const stmt = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
        [['Alice', 'alice@email.com'], ['Bob', 'bob@email.com'], ['Carol', 'carol@email.com']]
          .forEach(([name, email]) => stmt.run(name, email));
        stmt.finalize();
        console.log('🌱 Seed de usuários inserido.');
      }
    });
  });
};

migrate();
```

---

## src/middlewares/errorHandler.js
```js
export default function errorHandler(err, _req, res, _next) {
  console.error('🔥 Erro:', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Erro interno do servidor',
  });
}
```

---

## src/modules/users/user.repository.js
```js
import { db } from '../../config/db.js';

export const UsersRepository = {
  findAll() {
    return new Promise((resolve, reject) => {
      db.all('SELECT id, name, email, created_at FROM users ORDER BY id', [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  },

  findById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT id, name, email, created_at FROM users WHERE id = ?', [id], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  },

  create({ name, email }) {
    return new Promise((resolve, reject) => {
      const sql = 'INSERT INTO users (name, email) VALUES (?, ?)';
      db.run(sql, [name, email], function (err) {
        if (err) return reject(err);
        resolve({ id: this.lastID, name, email });
      });
    });
  },

  update(id, { name, email }) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE users SET name = ?, email = ? WHERE id = ?';
      db.run(sql, [name, email, id], function (err) {
        if (err) return reject(err);
        resolve({ changes: this.changes });
      });
    });
  },

  delete(id) {
    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM users WHERE id = ?';
      db.run(sql, [id], function (err) {
        if (err) return reject(err);
        resolve({ changes: this.changes });
      });
    });
  }
};
```

---

## src/modules/users/user.service.js
```js
import { UsersRepository } from './user.repository.js';

export const UsersService = {
  async list() {
    return UsersRepository.findAll();
  },

  async get(id) {
    const user = await UsersRepository.findById(id);
    if (!user) {
      const err = new Error('Usuário não encontrado');
      err.status = 404;
      throw err;
    }
    return user;
  },

  async create(payload) {
    if (!payload?.name || !payload?.email) {
      const err = new Error('Campos obrigatórios: name, email');
      err.status = 400;
      throw err;
    }
    return UsersRepository.create(payload);
  },

  async update(id, payload) {
    await this.get(id); // valida existência
    await UsersRepository.update(id, payload);
    return this.get(id);
  },

  async remove(id) {
    await this.get(id); // valida existência
    await UsersRepository.delete(id);
    return { success: true };
  }
};
```

---

## src/modules/users/user.controller.js
```js
import { UsersService } from './user.service.js';

export const UsersController = {
  async list(req, res, next) {
    try {
      const users = await UsersService.list();
      res.json(users);
    } catch (err) { next(err); }
  },

  async get(req, res, next) {
    try {
      const user = await UsersService.get(Number(req.params.id));
      res.json(user);
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const created = await UsersService.create(req.body);
      res.status(201).json(created);
    } catch (err) { next(err); }
  },

  async update(req, res, next) {
    try {
      const updated = await UsersService.update(Number(req.params.id), req.body);
      res.json(updated);
    } catch (err) { next(err); }
  },

  async remove(req, res, next) {
    try {
      const result = await UsersService.remove(Number(req.params.id));
      res.json(result);
    } catch (err) { next(err); }
  },
};
```

---

## src/modules/users/user.routes.js
```js
import { Router } from 'express';
import { UsersController } from './user.controller.js';

const router = Router();

router.get('/', UsersController.list);
router.get('/:id', UsersController.get);
router.post('/', UsersController.create);
router.put('/:id', UsersController.update);
router.delete('/:id', UsersController.remove);

export default router;
```

---

## public/index.html
```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Usuários</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin: 24px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px 12px; border-bottom: 1px solid #ddd; }
    th { text-align: left; }
    #form { margin: 16px 0; display: grid; gap: 8px; grid-template-columns: 1fr 1fr auto; }
    input { padding: 8px; }
    button { padding: 8px 12px; cursor: pointer; }
  </style>
</head>
<body>
  <h1>Usuários</h1>

  <div id="form">
    <input id="name" placeholder="Nome" />
    <input id="email" placeholder="Email" />
    <button id="add">Adicionar</button>
  </div>

  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Nome</th>
        <th>Email</th>
        <th>Criado em</th>
        <th>Ações</th>
      </tr>
    </thead>
    <tbody id="tbody"></tbody>
  </table>

  <script src="/script.js"></script>
</body>
</html>
```

---

## public/script.js
```js
async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

async function loadUsers() {
  const tbody = document.getElementById('tbody');
  tbody.innerHTML = '<tr><td colspan="5">Carregando...</td></tr>';
  try {
    const users = await fetchJSON('/api/users');
    tbody.innerHTML = '';
    for (const u of users) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${u.id}</td>
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td>${new Date(u.created_at).toLocaleString()}</td>
        <td>
          <button data-id="${u.id}" class="del">Excluir</button>
        </td>
      `;
      tbody.appendChild(tr);
    }
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5">Erro ao carregar: ${e.message}</td></tr>`;
  }
}

async function addUser() {
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  if (!name || !email) return alert('Preencha nome e email');
  try {
    await fetchJSON('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email })
    });
    document.getElementById('name').value = '';
    document.getElementById('email').value = '';
    await loadUsers();
  } catch (e) {
    alert('Erro: ' + e.message);
  }
}

async function deleteUser(id) {
  if (!confirm('Tem certeza que deseja excluir?')) return;
  try {
    await fetchJSON(`/api/users/${id}`, { method: 'DELETE' });
    await loadUsers();
  } catch (e) {
    alert('Erro: ' + e.message);
  }
}

// listeners
addEventListener('click', (e) => {
  const btn = e.target.closest('button.del');
  if (btn) {
    const id = btn.getAttribute('data-id');
    deleteUser(id);
  }
});

document.getElementById('add').addEventListener('click', addUser);

// inicializa
loadUsers();
```

---

# Como rodar

```bash
npm install
npm run dev  # ou: npm start
# abra http://localhost:3000
```

---

### Observações
- **Camadas**: rota → controller → service → repository → SQLite.
- **Validação & erros** simples no service/controller e middleware global.
- **Seeds** automáticos na criação do DB.
- **ESM (import/export)**; se preferir CommonJS, posso converter.
- Pronto para evoluir com paginação, filtros e testes.
