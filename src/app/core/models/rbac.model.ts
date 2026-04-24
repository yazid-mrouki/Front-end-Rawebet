export interface PermissionResponse {
  id: number;
  name: string;
  module: string;
  action: string;
}

export interface RoleResponse {
  id: number;
  name: string;
  permissions: string[];
}
