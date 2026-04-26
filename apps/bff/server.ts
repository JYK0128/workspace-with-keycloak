import cors from 'cors';
import express, { Request, Response as ExResponse } from 'express';

interface KeycloakRole {
  id: string;
  name: string;
  description?: string;
}

const app = express();
app.use(express.json());

const frontendOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';
app.use(
  cors({
    origin: frontendOrigin,
    methods: ['GET', 'POST', 'DELETE'],
  }),
);

const keycloakUrl = process.env.KEYCLOAK_URL ?? 'http://localhost:8080';
const keycloakRealm = process.env.KEYCLOAK_REALM ?? 'master';
const keycloakAdminUser = process.env.KEYCLOAK_ADMIN_USERNAME ?? 'admin';
const keycloakAdminPassword = process.env.KEYCLOAK_ADMIN_PASSWORD ?? 'admin1234';

const getAdminAccessToken = async (): Promise<string> => {
  const params = new URLSearchParams({
    grant_type: 'password',
    client_id: 'admin-cli',
    username: keycloakAdminUser,
    password: keycloakAdminPassword,
  });

  const response = await fetch(`${keycloakUrl}/realms/master/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  if (!response.ok) {
    throw new Error(`Failed to get admin token: ${response.status}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
};

const callAdminApi = async (path: string, options: RequestInit = {}): Promise<globalThis.Response> => {
  const token = await getAdminAccessToken();

  const response = await fetch(`${keycloakUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Keycloak admin API failed (${response.status}): ${body}`);
  }

  return response;
};

const getRealmRoles = async (): Promise<KeycloakRole[]> => {
  const response = await callAdminApi(`/admin/realms/${keycloakRealm}/roles?briefRepresentation=false`);
  return (await response.json()) as KeycloakRole[];
};

const parseError = (error: unknown): string => (error instanceof Error ? error.message : 'Unknown error');

const getRolesByNames = async (roleNames: string[]): Promise<KeycloakRole[]> => {
  const realmRoles = await getRealmRoles();
  return realmRoles.filter((role) => roleNames.includes(role.name));
};

app.get('/health', (_req: Request, res: ExResponse) => {
  res.json({ status: 'ok' });
});

app.get('/api/users', async (_req: Request, res: ExResponse) => {
  try {
    const response = await callAdminApi(`/admin/realms/${keycloakRealm}/users?briefRepresentation=true&max=50`);
    const users = await response.json();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: parseError(error) });
  }
});

app.post('/api/users', async (req: Request, res: ExResponse) => {
  const { username, email } = req.body as { username?: string; email?: string };

  if (!username || !email) {
    res.status(400).json({ message: 'username, email은 필수입니다.' });
    return;
  }

  try {
    await callAdminApi(`/admin/realms/${keycloakRealm}/users`, {
      method: 'POST',
      body: JSON.stringify({ username, email, enabled: true }),
    });
    res.status(201).json({ message: 'created' });
  } catch (error) {
    res.status(500).json({ message: parseError(error) });
  }
});

app.get('/api/roles', async (_req: Request, res: ExResponse) => {
  try {
    const roles = await getRealmRoles();
    res.json(roles);
  } catch (error) {
    res.status(500).json({ message: parseError(error) });
  }
});

app.get('/api/users/:userId/roles', async (req: Request, res: ExResponse) => {
  try {
    const userId = encodeURIComponent(req.params.userId);
    const response = await callAdminApi(`/admin/realms/${keycloakRealm}/users/${userId}/role-mappings/realm`);
    const roles = await response.json();
    res.json(roles);
  } catch (error) {
    res.status(500).json({ message: parseError(error) });
  }
});

app.post('/api/users/:userId/roles', async (req: Request, res: ExResponse) => {
  try {
    const userId = encodeURIComponent(req.params.userId);
    const roleNames = (req.body as { roles?: string[] }).roles ?? [];

    if (roleNames.length === 0) {
      res.status(400).json({ message: 'roles 배열은 필수입니다.' });
      return;
    }

    const payload = await getRolesByNames(roleNames);

    if (payload.length === 0) {
      res.status(400).json({ message: '유효한 role이 없습니다.' });
      return;
    }

    await callAdminApi(`/admin/realms/${keycloakRealm}/users/${userId}/role-mappings/realm`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: parseError(error) });
  }
});

app.delete('/api/users/:userId/roles', async (req: Request, res: ExResponse) => {
  try {
    const userId = encodeURIComponent(req.params.userId);
    const roleNames = (req.body as { roles?: string[] }).roles ?? [];

    if (roleNames.length === 0) {
      res.status(400).json({ message: 'roles 배열은 필수입니다.' });
      return;
    }

    const payload = await getRolesByNames(roleNames);

    if (payload.length === 0) {
      res.status(400).json({ message: '유효한 role이 없습니다.' });
      return;
    }

    await callAdminApi(`/admin/realms/${keycloakRealm}/users/${userId}/role-mappings/realm`, {
      method: 'DELETE',
      body: JSON.stringify(payload),
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: parseError(error) });
  }
});


app.post('/api/roles', async (req: Request, res: ExResponse) => {
  const { name, description } = req.body as { name?: string; description?: string };

  if (!name) {
    res.status(400).json({ message: 'role name은 필수입니다.' });
    return;
  }

  try {
    await callAdminApi(`/admin/realms/${keycloakRealm}/roles`, {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
    res.status(201).json({ message: 'created' });
  } catch (error) {
    res.status(500).json({ message: parseError(error) });
  }
});

app.delete('/api/roles/:roleName', async (req: Request, res: ExResponse) => {
  try {
    const roleName = encodeURIComponent(req.params.roleName);
    await callAdminApi(`/admin/realms/${keycloakRealm}/roles/${roleName}`, {
      method: 'DELETE',
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: parseError(error) });
  }
});

app.get('/api/roles/:roleName/composites', async (req: Request, res: ExResponse) => {
  try {
    const roleName = encodeURIComponent(req.params.roleName);
    const response = await callAdminApi(`/admin/realms/${keycloakRealm}/roles/${roleName}/composites`);
    const composites = await response.json();
    res.json(composites);
  } catch (error) {
    res.status(500).json({ message: parseError(error) });
  }
});

app.post('/api/roles/:roleName/composites', async (req: Request, res: ExResponse) => {
  try {
    const roleName = encodeURIComponent(req.params.roleName);
    const roleNames = (req.body as { roles?: string[] }).roles ?? [];

    if (roleNames.length === 0) {
      res.status(400).json({ message: 'roles 배열은 필수입니다.' });
      return;
    }

    const payload = await getRolesByNames(roleNames);
    if (payload.length === 0) {
      res.status(400).json({ message: '유효한 role이 없습니다.' });
      return;
    }

    await callAdminApi(`/admin/realms/${keycloakRealm}/roles/${roleName}/composites`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: parseError(error) });
  }
});

app.delete('/api/roles/:roleName/composites', async (req: Request, res: ExResponse) => {
  try {
    const roleName = encodeURIComponent(req.params.roleName);
    const roleNames = (req.body as { roles?: string[] }).roles ?? [];

    if (roleNames.length === 0) {
      res.status(400).json({ message: 'roles 배열은 필수입니다.' });
      return;
    }

    const payload = await getRolesByNames(roleNames);
    if (payload.length === 0) {
      res.status(400).json({ message: '유효한 role이 없습니다.' });
      return;
    }

    await callAdminApi(`/admin/realms/${keycloakRealm}/roles/${roleName}/composites`, {
      method: 'DELETE',
      body: JSON.stringify(payload),
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: parseError(error) });
  }
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`BFF server listening on http://localhost:${port}`);
});
