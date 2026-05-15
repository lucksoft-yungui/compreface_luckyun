import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Typography, Spin } from 'antd';
import { AppstoreOutlined, HddOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getApplications, getModels } from '../api/admin';
import type { Application } from '../types';

const { Title } = Typography;

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [modelCount, setModelCount] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const appList = await getApplications();
        setApps(appList);
        let totalModels = 0;
        for (const app of appList) {
          try {
            const models = await getModels(app.id);
            totalModels += models.length;
          } catch {
            // ignore
          }
        }
        setModelCount(totalModels);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div>
      <Title level={4}>欢迎回来，{user?.firstName}！</Title>
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={8}>
          <Card hoverable onClick={() => navigate('/apps')}>
            <Statistic title="应用数量" value={apps.length} prefix={<AppstoreOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card hoverable onClick={() => navigate('/apps')}>
            <Statistic title="模型数量" value={modelCount} prefix={<HddOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="用户角色" value={user?.globalRole || 'USER'} prefix={<UserOutlined />} />
          </Card>
        </Col>
      </Row>
      <Card title="快捷入口" style={{ marginTop: 24 }}>
        <Row gutter={[16, 16]}>
          {apps.slice(0, 3).map((app) => (
            <Col key={app.id} xs={24} sm={8}>
              <Card
                size="small"
                hoverable
                onClick={() => navigate(`/apps/${app.id}`)}
              >
                <Statistic title={app.name} value="管理模型" valueStyle={{ fontSize: 16 }} />
              </Card>
            </Col>
          ))}
          {apps.length === 0 && (
            <Col span={24}>
              <span style={{ color: '#999' }}>暂无应用，请先创建应用</span>
            </Col>
          )}
        </Row>
      </Card>
    </div>
  );
}
