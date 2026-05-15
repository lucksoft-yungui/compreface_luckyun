import axios from 'axios';
import type { AuthTokens, UserInfo } from '../types';
import { adminUrl, BASIC_TOKEN } from './config';

export async function login(email: string, password: string): Promise<AuthTokens> {
  const form = new FormData();
  form.append('username', email);
  form.append('password', password);
  form.append('grant_type', 'password');

  const res = await axios.post<AuthTokens>(adminUrl('oauth/token'), form, {
    headers: {
      Authorization: BASIC_TOKEN,
    },
    withCredentials: false,
  });
  return res.data;
}

export async function register(
  firstName: string,
  lastName: string,
  email: string,
  password: string
): Promise<{ message: string }> {
  const res = await axios.post(adminUrl('user/register'), {
    firstName,
    lastName,
    email,
    password,
    isAllowStatistics: false,
  });
  return res.data;
}

export async function getUserInfo(): Promise<UserInfo> {
  const res = await axios.get<UserInfo>(adminUrl('user/me'), {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return res.data;
}

export async function logout(): Promise<void> {
  try {
    await axios.delete(adminUrl('oauth/token'), {
      headers: { Authorization: BASIC_TOKEN },
    });
  } catch {
    // ignore
  }
  clearToken();
}

export function getToken(): string | null {
  return localStorage.getItem('access_token');
}

export function setToken(token: string) {
  localStorage.setItem('access_token', token);
}

export function clearToken() {
  localStorage.removeItem('access_token');
}
