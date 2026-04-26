import axios from 'axios';

export interface KeycloakUser {
  id: string;
  username: string;
  email?: string;
  enabled?: boolean;
}

export interface KeycloakRole {
  id: string;
  name: string;
  description?: string;
}

const getBffBaseUrl = (): string => import.meta.env.VITE_BFF_URL ?? 'http://localhost:4000';

export const fetchUsers = async (): Promise<KeycloakUser[]> => {
  const response = await axios.get<KeycloakUser[]>(`${getBffBaseUrl()}/api/users`);
  return response.data;
};

export const createUser = async (payload: {
  username: string;
  email: string;
  enabled: boolean;
}): Promise<void> => {
  await axios.post(`${getBffBaseUrl()}/api/users`, payload);
};

export const fetchRoles = async (): Promise<KeycloakRole[]> => {
  const response = await axios.get<KeycloakRole[]>(`${getBffBaseUrl()}/api/roles`);
  return response.data;
};

export const createRole = async (payload: { name: string; description?: string }): Promise<void> => {
  await axios.post(`${getBffBaseUrl()}/api/roles`, payload);
};

export const deleteRole = async (roleName: string): Promise<void> => {
  await axios.delete(`${getBffBaseUrl()}/api/roles/${roleName}`);
};

export const fetchRoleComposites = async (roleName: string): Promise<KeycloakRole[]> => {
  const response = await axios.get<KeycloakRole[]>(`${getBffBaseUrl()}/api/roles/${roleName}/composites`);
  return response.data;
};

export const assignCompositesToRole = async (roleName: string, roles: string[]): Promise<void> => {
  await axios.post(`${getBffBaseUrl()}/api/roles/${roleName}/composites`, { roles });
};

export const removeCompositesFromRole = async (roleName: string, roles: string[]): Promise<void> => {
  await axios.delete(`${getBffBaseUrl()}/api/roles/${roleName}/composites`, { data: { roles } });
};

export const fetchUserRoles = async (userId: string): Promise<KeycloakRole[]> => {
  const response = await axios.get<KeycloakRole[]>(`${getBffBaseUrl()}/api/users/${userId}/roles`);
  return response.data;
};

export const assignRolesToUser = async (userId: string, roles: string[]): Promise<void> => {
  await axios.post(`${getBffBaseUrl()}/api/users/${userId}/roles`, { roles });
};

export const removeRolesFromUser = async (userId: string, roles: string[]): Promise<void> => {
  await axios.delete(`${getBffBaseUrl()}/api/users/${userId}/roles`, { data: { roles } });
};
