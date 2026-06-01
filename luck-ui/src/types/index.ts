export interface UserInfo {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  globalRole: string;
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
}

export interface Application {
  id: string;
  name: string;
  owner: string;
}

export interface Model {
  id: string;
  name: string;
  type: 'RECOGNITION' | 'DETECTION' | 'VERIFICATION';
  apiKey: string;
}

export interface Subject {
  subject: string;
}

export interface Face {
  image_id: string;
  subject: string;
}

export interface FaceListResponse {
  faces: Face[];
  page_number: number;
  page_size: number;
  total_pages: number;
  total_elements: number;
}

export interface RecognitionResult {
  age?: {
    probability: number;
    high: number;
    low: number;
  };
  gender?: {
    probability: number;
    value: string;
  };
  pose?: {
    pitch: number;
    roll: number;
    yaw: number;
  };
  box: {
    probability: number;
    x_max: number;
    y_max: number;
    x_min: number;
    y_min: number;
  };
  landmarks?: number[][];
  front_face_check?: {
    passed: boolean;
    mode: string;
    thresholds?: {
      max_yaw: number;
      max_pitch: number;
      max_roll: number;
    };
    actual?: {
      pitch: number;
      roll: number;
      yaw: number;
    };
    reasons?: string[];
  };
  subjects?: {
    similarity: number;
    subject: string;
  }[];
}

export interface RecognizeResponse {
  result: RecognitionResult[];
  plugins_versions?: Record<string, string>;
}

export interface FrontFaceCheckResponse {
  result: RecognitionResult[];
  plugins_versions?: Record<string, string>;
}
