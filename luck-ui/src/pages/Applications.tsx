import { useEffect, useState, useCallback } from 'react';
import { Card, Table, Button, Modal, Form, Input, Popconfirm, Typography, App, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getApplications, createApplication, deleteApplication } from '../api/admin';
import type { Application } from '../types';

const { Title } = Typography;

export function ApplicationsPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { message } = App.useApp();

  const fetchApps = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getApplications();
      setApps(list);
    } catch {
      message.error('加载应用列表失败');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setCreating(true);
      await createApplication(values.name);
      message.success('应用创建成功');
      setCreateOpen(false);
      form.resetFields();
      fetchApps();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || '创建失败');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteApplication(id);
      message.success('删除成功');
      fetchApps();
    } catch {
      message.error('删除失败');
    }
  };

  const columns = [
    { title: '应用名称', dataIndex: 'name', key: 'name' },
    { title: 'ID', dataIndex: 'id', key: 'id', ellipsis: true },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Application) => (
        <>
          <Button type="link" onClick={() => navigate(`/apps/${record.id}`)}>
            管理
          </Button>
          <Popconfirm title="确定删除此应用？" onConfirm={() => handleDelete(record.id)}>
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
        <Title level={4} style={{ margin: 0 }}>应用管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          创建应用
        </Button>
      </div>
      <Card>
        <Table
          dataSource={apps}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Card>
      <Modal
        title="创建应用"
        open={createOpen}
        onOk={handleCreate}
        onCancel={() => { setCreateOpen(false); form.resetFields(); }}
        confirmLoading={creating}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="应用名称" rules={[{ required: true, message: '请输入应用名称' }]}>
            <Input placeholder="例如: 员工考勤系统" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
