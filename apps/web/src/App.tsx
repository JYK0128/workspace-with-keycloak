import { FormEvent, useEffect, useMemo, useState } from 'react';
import keycloak from './keycloak';
import {
  assignCompositesToRole,
  assignRolesToUser,
  createRole,
  createUser,
  deleteRole,
  fetchRoleComposites,
  fetchRoles,
  fetchUserRoles,
  fetchUsers,
  KeycloakRole,
  KeycloakUser,
  removeCompositesFromRole,
  removeRolesFromUser,
} from './keycloakAdminApi';

function App() {
  const [initialized, setInitialized] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [users, setUsers] = useState<KeycloakUser[]>([]);
  const [roles, setRoles] = useState<KeycloakRole[]>([]);

  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRoleNames, setSelectedRoleNames] = useState<string[]>([]);
  const [userRoleNames, setUserRoleNames] = useState<string[]>([]);

  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [selectedRoleForPermission, setSelectedRoleForPermission] = useState('');
  const [selectedPermissionRoleNames, setSelectedPermissionRoleNames] = useState<string[]>([]);
  const [compositeRoleNames, setCompositeRoleNames] = useState<string[]>([]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ username: '', email: '' });

  const loginName = useMemo(
    () => (keycloak.tokenParsed?.preferred_username as string | undefined) ?? '-',
    [authenticated],
  );

  useEffect(() => {
    keycloak
      .init({
        onLoad: 'check-sso',
        pkceMethod: 'S256',
        checkLoginIframe: false,
      })
      .then((isAuthenticated) => {
        setAuthenticated(isAuthenticated);
        setInitialized(true);
      })
      .catch(() => {
        setError('Keycloak 초기화에 실패했습니다. Keycloak 컨테이너 상태를 확인하세요.');
        setInitialized(true);
      });
  }, []);

  const loadUsers = async () => {
    if (!keycloak.authenticated) return;
    setLoading(true);
    setError('');

    try {
      setUsers(await fetchUsers());
    } catch (loadError) {
      setError('사용자 목록을 불러오지 못했습니다. BFF 또는 Keycloak 상태를 확인하세요.');
      console.error(loadError);
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      setRoles(await fetchRoles());
    } catch (loadError) {
      setError('Role 목록을 불러오지 못했습니다.');
      console.error(loadError);
    }
  };

  const loadUserRoles = async (userId: string) => {
    if (!userId) {
      setUserRoleNames([]);
      return;
    }

    try {
      const result = await fetchUserRoles(userId);
      setUserRoleNames(result.map((role) => role.name));
    } catch (loadError) {
      setError('사용자 Role 조회에 실패했습니다.');
      console.error(loadError);
    }
  };

  const loadRoleComposites = async (roleName: string) => {
    if (!roleName) {
      setCompositeRoleNames([]);
      return;
    }

    try {
      const result = await fetchRoleComposites(roleName);
      setCompositeRoleNames(result.map((role) => role.name));
    } catch (loadError) {
      setError('Role 권한(Composite) 조회에 실패했습니다.');
      console.error(loadError);
    }
  };

  useEffect(() => {
    if (!authenticated) return;
    loadUsers();
    loadRoles();
  }, [authenticated]);

  useEffect(() => {
    loadUserRoles(selectedUserId);
  }, [selectedUserId]);

  useEffect(() => {
    loadRoleComposites(selectedRoleForPermission);
  }, [selectedRoleForPermission]);

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    try {
      await createUser({ username: form.username, email: form.email, enabled: true });
      setForm({ username: '', email: '' });
      await loadUsers();
    } catch (createError) {
      setError('사용자 생성에 실패했습니다. 중복 username 또는 BFF 로그를 확인하세요.');
      console.error(createError);
    }
  };

  const handleCreateRole = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newRoleName) return;

    try {
      await createRole({ name: newRoleName, description: newRoleDesc });
      setNewRoleName('');
      setNewRoleDesc('');
      await loadRoles();
    } catch (createError) {
      setError('Role 생성에 실패했습니다.');
      console.error(createError);
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRoleForPermission) return;

    try {
      await deleteRole(selectedRoleForPermission);
      setSelectedRoleForPermission('');
      setCompositeRoleNames([]);
      await loadRoles();
    } catch (deleteError) {
      setError('Role 삭제에 실패했습니다.');
      console.error(deleteError);
    }
  };

  const handleAssignRoles = async () => {
    if (!selectedUserId || selectedRoleNames.length === 0) return;

    try {
      await assignRolesToUser(selectedUserId, selectedRoleNames);
      await loadUserRoles(selectedUserId);
      setSelectedRoleNames([]);
    } catch (assignError) {
      setError('Role 할당에 실패했습니다.');
      console.error(assignError);
    }
  };

  const handleRemoveRoles = async () => {
    if (!selectedUserId || selectedRoleNames.length === 0) return;

    try {
      await removeRolesFromUser(selectedUserId, selectedRoleNames);
      await loadUserRoles(selectedUserId);
      setSelectedRoleNames([]);
    } catch (removeError) {
      setError('Role 제거에 실패했습니다.');
      console.error(removeError);
    }
  };

  const handleAssignPermissions = async () => {
    if (!selectedRoleForPermission || selectedPermissionRoleNames.length === 0) return;

    try {
      await assignCompositesToRole(selectedRoleForPermission, selectedPermissionRoleNames);
      await loadRoleComposites(selectedRoleForPermission);
      setSelectedPermissionRoleNames([]);
    } catch (assignError) {
      setError('Role 권한(Composite) 추가에 실패했습니다.');
      console.error(assignError);
    }
  };

  const handleRemovePermissions = async () => {
    if (!selectedRoleForPermission || selectedPermissionRoleNames.length === 0) return;

    try {
      await removeCompositesFromRole(selectedRoleForPermission, selectedPermissionRoleNames);
      await loadRoleComposites(selectedRoleForPermission);
      setSelectedPermissionRoleNames([]);
    } catch (removeError) {
      setError('Role 권한(Composite) 제거에 실패했습니다.');
      console.error(removeError);
    }
  };

  if (!initialized) return <main className="container">초기화 중...</main>;

  if (!authenticated) {
    return (
      <main className="container">
        <h1>Keycloak React 관리자 페이지</h1>
        <p>먼저 Keycloak 로그인으로 인증을 진행하세요.</p>
        <button type="button" onClick={() => keycloak.login()}>
          로그인
        </button>
      </main>
    );
  }

  return (
    <main className="container">
      <header className="header">
        <div>
          <h1>Keycloak React 관리자 페이지</h1>
          <p>로그인 사용자: {loginName}</p>
        </div>
        <div className="actions">
          <button type="button" onClick={loadUsers}>사용자 새로고침</button>
          <button type="button" className="ghost" onClick={() => keycloak.logout()}>로그아웃</button>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      <section className="panel">
        <h2>사용자 생성</h2>
        <form onSubmit={handleCreateUser} className="form">
          <input placeholder="username" value={form.username} onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))} required />
          <input placeholder="email" type="email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} required />
          <button type="submit">생성</button>
        </form>
      </section>

      <section className="panel">
        <h2>롤(Role) / 권한(Composite) 관리</h2>
        <form onSubmit={handleCreateRole} className="form">
          <input placeholder="new role name" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} required />
          <input placeholder="description" value={newRoleDesc} onChange={(e) => setNewRoleDesc(e.target.value)} />
          <button type="submit">Role 생성</button>
        </form>

        <div className="form top-gap">
          <select value={selectedRoleForPermission} onChange={(event) => setSelectedRoleForPermission(event.target.value)}>
            <option value="">Role 선택</option>
            {roles.map((role) => (
              <option key={role.id} value={role.name}>{role.name}</option>
            ))}
          </select>

          <select
            multiple
            value={selectedPermissionRoleNames}
            onChange={(event) => setSelectedPermissionRoleNames(Array.from(event.target.selectedOptions).map((option) => option.value))}
          >
            {roles
              .filter((role) => role.name !== selectedRoleForPermission)
              .map((role) => (
                <option key={role.id} value={role.name}>{role.name}</option>
              ))}
          </select>
        </div>

        <div className="actions">
          <button type="button" onClick={handleAssignPermissions}>선택 권한 추가</button>
          <button type="button" className="ghost" onClick={handleRemovePermissions}>선택 권한 제거</button>
          <button type="button" className="danger" onClick={handleDeleteRole}>선택 Role 삭제</button>
        </div>

        <p>현재 Composite 권한: {compositeRoleNames.length === 0 ? '없음' : compositeRoleNames.join(', ')}</p>
      </section>

      <section className="panel">
        <h2>사용자 역할(RBAC) 관리</h2>
        <div className="form">
          <select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
            <option value="">사용자 선택</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>{user.username}</option>
            ))}
          </select>

          <select
            multiple
            value={selectedRoleNames}
            onChange={(event) => setSelectedRoleNames(Array.from(event.target.selectedOptions).map((option) => option.value))}
          >
            {roles.map((role) => (
              <option key={role.id} value={role.name}>{role.name}</option>
            ))}
          </select>
        </div>

        <div className="actions">
          <button type="button" onClick={handleAssignRoles}>선택 Role 할당</button>
          <button type="button" className="ghost" onClick={handleRemoveRoles}>선택 Role 제거</button>
        </div>

        <p>현재 사용자 Role: {userRoleNames.length === 0 ? '없음' : userRoleNames.join(', ')}</p>
      </section>

      <section className="panel">
        <h2>사용자 목록</h2>
        {loading ? (
          <p>불러오는 중...</p>
        ) : (
          <table>
            <thead>
              <tr><th>Username</th><th>Email</th><th>Enabled</th></tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={3}>사용자가 없습니다. 새로고침을 눌러보세요.</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}><td>{user.username}</td><td>{user.email ?? '-'}</td><td>{user.enabled ? 'Y' : 'N'}</td></tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

export default App;
