import axios from 'axios';
import { getToken } from './auth';
import { adminUrl } from './config';
import type { Application, Model } from '../types';

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}` };
}

export async function getApplications(): Promise<Application[]> {
  const res = await axios.get<Application[]>(adminUrl('apps'), { headers: authHeaders() });
  return res.data;
}

export async function createApplication(name: string): Promise<Application> {
  const res = await axios.post<Application>(adminUrl('app'), { name }, { headers: authHeaders() });
  return res.data;
}

export async function deleteApplication(appId: string): Promise<void> {
  await axios.delete(adminUrl(`app/${appId}`), { headers: authHeaders() });
}

export async function getModels(appId: string): Promise<Model[]> {
  const res = await axios.get<Model[]>(adminUrl(`app/${appId}/models`), { headers: authHeaders() });
  return res.data;
}

export async function createModel(appId: string, name: string, type: string = 'RECOGNITION'): Promise<Model> {
  const res = await axios.post<Model>(
    adminUrl(`app/${appId}/model`),
    { name, type },
    { headers: authHeaders() }
  );
  return res.data;
}

export async function deleteModel(appId: string, modelId: string): Promise<void> {
  await axios.delete(adminUrl(`app/${appId}/model/${modelId}`), { headers: authHeaders() });
}
