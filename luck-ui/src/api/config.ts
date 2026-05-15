export const BASIC_TOKEN = 'Basic Q29tbW9uQ2xpZW50SWQ6cGFzc3dvcmQ=';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const ADMIN_API_URL = trimTrailingSlash(import.meta.env.VITE_ADMIN_API_URL || '/admin');
export const USER_API_URL = trimTrailingSlash(import.meta.env.VITE_USER_API_URL || '/api/v1');

export function adminUrl(path: string) {
  return `${ADMIN_API_URL}/${path.replace(/^\/+/, '')}`;
}

export function userApiUrl(path: string) {
  return `${USER_API_URL}/${path.replace(/^\/+/, '')}`;
}
