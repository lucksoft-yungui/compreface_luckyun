import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/Login';
import { RegisterPage } from './pages/Register';
import { DashboardPage } from './pages/Dashboard';
import { ApplicationsPage } from './pages/Applications';
import { ApplicationDetailPage } from './pages/ApplicationDetail';
import { FaceManagementPage } from './pages/FaceManagement';
import { FaceDetectionPage } from './pages/FaceDetection';
import { FaceRecognitionPage } from './pages/FaceRecognition';

export default function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
        },
      }}
    >
      <AntApp>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="apps" element={<ApplicationsPage />} />
                <Route path="apps/:appId" element={<ApplicationDetailPage />} />
                <Route path="apps/:appId/models/:modelId/faces" element={<FaceManagementPage />} />
                <Route path="apps/:appId/models/:modelId/detect" element={<FaceDetectionPage />} />
                <Route path="apps/:appId/models/:modelId/recognize" element={<FaceRecognitionPage />} />
              </Route>
              <Route path="*" element={<LoginPage />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </AntApp>
    </ConfigProvider>
  );
}
