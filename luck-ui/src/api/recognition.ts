import axios from 'axios';
import { userApiUrl } from './config';
import type { FaceListResponse, RecognizeResponse, Subject } from '../types';

function apiHeaders(apiKey: string) {
  return { 'x-api-key': apiKey };
}

export async function getSubjects(apiKey: string): Promise<string[]> {
  const res = await axios.get<{ subjects: string[] }>(
    userApiUrl('recognition/subjects'),
    { headers: apiHeaders(apiKey) }
  );
  return res.data.subjects;
}

export async function addSubject(apiKey: string, subject: string): Promise<Subject> {
  const res = await axios.post<Subject>(
    userApiUrl('recognition/subjects'),
    { subject },
    { headers: { ...apiHeaders(apiKey), 'Content-Type': 'application/json' } }
  );
  return res.data;
}

export async function renameSubject(apiKey: string, oldName: string, newName: string): Promise<void> {
  await axios.put(
    userApiUrl(`recognition/subjects/${encodeURIComponent(oldName)}`),
    { subject: newName },
    { headers: { ...apiHeaders(apiKey), 'Content-Type': 'application/json' } }
  );
}

export async function deleteSubject(apiKey: string, subject: string): Promise<void> {
  await axios.delete(userApiUrl(`recognition/subjects/${encodeURIComponent(subject)}`), {
    headers: apiHeaders(apiKey),
  });
}

export async function getFaces(
  apiKey: string,
  subject?: string,
  page = 0,
  size = 50
): Promise<FaceListResponse> {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('size', String(size));
  if (subject) params.set('subject', subject);

  const res = await axios.get<FaceListResponse>(
    `${userApiUrl('recognition/faces')}?${params.toString()}`,
    { headers: apiHeaders(apiKey) }
  );
  return res.data;
}

export async function addFace(
  apiKey: string,
  subject: string,
  file: File
): Promise<{ image_id: string; subject: string }> {
  const form = new FormData();
  form.append('file', file);

  const res = await axios.post(
    `${userApiUrl('recognition/faces')}?subject=${encodeURIComponent(subject)}`,
    form,
    { headers: apiHeaders(apiKey) }
  );
  return res.data;
}

export async function addFaceBase64(
  apiKey: string,
  subject: string,
  base64: string
): Promise<{ image_id: string; subject: string }> {
  const res = await axios.post(
    `${userApiUrl('recognition/faces')}?subject=${encodeURIComponent(subject)}`,
    { file: base64 },
    { headers: { ...apiHeaders(apiKey), 'Content-Type': 'application/json' } }
  );
  return res.data;
}

export async function deleteFace(apiKey: string, imageId: string): Promise<void> {
  await axios.delete(userApiUrl(`recognition/faces/${imageId}`), {
    headers: apiHeaders(apiKey),
  });
}

export async function deleteFaces(apiKey: string, imageIds: string[]): Promise<void> {
  await axios.post(
    userApiUrl('recognition/faces/delete'),
    imageIds,
    { headers: { ...apiHeaders(apiKey), 'Content-Type': 'application/json' } }
  );
}

export async function recognize(
  apiKey: string,
  file: File,
  facePlugins = 'age,gender'
): Promise<RecognizeResponse> {
  const form = new FormData();
  form.append('file', file);

  const res = await axios.post<RecognizeResponse>(
    `${userApiUrl('recognition/recognize')}?face_plugins=${facePlugins}&prediction_count=5`,
    form,
    { headers: apiHeaders(apiKey) }
  );
  return res.data;
}

export function getFaceImageUrl(apiKey: string, imageId: string): string {
  return userApiUrl(`static/${encodeURIComponent(apiKey)}/images/${encodeURIComponent(imageId)}`);
}
