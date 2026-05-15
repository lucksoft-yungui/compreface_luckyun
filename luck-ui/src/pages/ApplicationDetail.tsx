import { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Popconfirm,
  Typography,
  App,
  Tag,
  Descriptions,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  ScanOutlined,
  TeamOutlined,
  CopyOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { getModels, createModel, deleteModel } from '../api/admin';
import type { Model } from '../types';

const { Title } = Typography;

export function ApplicationDetailPage() {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();
  const { message } = App.useApp();

  const fetchModels = useCallback(async () => {
    if (!appId) return;
    setLoading(true);
    try {
      const list = await getModels(appId);
      setModels(list);
    } catch {
      message.error('加载模型列表失败');
    } finally {
      setLoading(false);
    }
  }, [appId, message]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const handleCreate = async () => {
    if (!appId) return;
    try {
      const values = await form.validateFields();
      setCreating(true);
      await createModel(appId, values.name, values.type);
      message.success('模型创建成功');
      setCreateOpen(false);
      form.resetFields();
      fetchModels();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || '创建失败');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (modelId: string) => {
    if (!appId) return;
    try {
      await deleteModel(appId, modelId);
      message.success('删除成功');
      fetchModels();
    } catch {
      message.error('删除失败');
    }
  };

  const copyApiKey = (apiKey: string) => {
    navigator.clipboard.writeText(apiKey).then(() => {
      message.success('API Key 已复制');
    });
  };

  const typeColors: Record<string, string> = {
    RECOGNITION: 'blue',
    DETECTION: 'green',
    VERIFICATION: 'orange',
  };

  const columns = [
    { title: '模型名称', dataIndex: 'name', key: 'name' },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag color={typeColors[type] || 'default'}>{type}</Tag>,
    },
    {
      title: 'API Key',
      dataIndex: 'apiKey',
      key: 'apiKey',
      render: (key: string) => (
        <Tooltip title="点击复制">
          <Button type="link" icon={<CopyOutlined />} onClick={() => copyApiKey(key)}>
            {key.substring(0, 12)}...
          </Button>
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Model) => (
        <>
          {record.type === 'RECOGNITION' && (
            <>
              <Button
                type="link"
                icon={<TeamOutlined />}
                onClick={() => navigate(`/apps/${appId}/models/${record.id}/faces`)}
              >
                人脸维护
              </Button>
              <Button
                type="link"
                icon={<ScanOutlined />}
                onClick={() => navigate(`/apps/${appId}/models/${record.id}/recognize`)}
              >
                人脸识别
              </Button>
            </>
          )}
          <Popconfirm title="确定删除此模型？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/apps')} />
          <Title level={4} style={{ margin: 0 }}>模型管理</Title>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          创建模型
        </Button>
      </div>
      <Card>
        <Table
          dataSource={models}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Card>
      <Modal
        title="创建模型"
        open={createOpen}
        onOk={handleCreate}
        onCancel={() => { setCreateOpen(false); form.resetFields(); }}
        confirmLoading={creating}
      >
        <Form form={form} layout="vertical" initialValues={{ type: 'RECOGNITION' }}>
          <Form.Item name="name" label="模型名称" rules={[{ required: true, message: '请输入模型名称' }]}>
            <Input placeholder="例如: 员工人脸库" />
          </Form.Item>
          <Form.Item name="type" label="模型类型" rules={[{ required: true }]}>
            <Select
              options={[
                { label: 'RECOGNITION - 人脸识别', value: 'RECOGNITION' },
                { label: 'DETECTION - 人脸检测', value: 'DETECTION' },
                { label: 'VERIFICATION - 人脸验证', value: 'VERIFICATION' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
