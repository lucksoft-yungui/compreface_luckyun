import { useEffect, useState, useCallback } from 'react';
import JSZip from 'jszip';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Typography,
  App,
  Upload,
  Space,
  Progress,
  Image,
  Tag,
  Tabs,
  Alert,
  Switch,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  UploadOutlined,
  InboxOutlined,
  ArrowLeftOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { getModels } from '../api/admin';
import {
  getSubjects,
  addSubject,
  deleteSubject,
  renameSubject,
  getFaces,
  addFace,
  deleteFace,
  deleteFaces,
  getFaceImageUrl,
} from '../api/recognition';
import { compressImage } from '../utils/compress';
import type { Face, Model } from '../types';

const { Title, Text } = Typography;
const { Dragger } = Upload;
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'bmp', 'gif', 'webp', 'tif', 'tiff', 'ico']);

function filenameToSubject(fileName: string): string {
  const leafName = fileName.split('/').pop() || fileName;
  const base = leafName.replace(/\.[^.]+$/, '').trim();
  return base || `user_${Date.now()}`;
}

function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

function isImageFile(fileName: string): boolean {
  return IMAGE_EXTENSIONS.has(getFileExtension(fileName));
}

function isZipFile(file: File): boolean {
  return getFileExtension(file.name) === 'zip' || file.type === 'application/zip' || file.type === 'application/x-zip-compressed';
}

function imageMimeType(fileName: string): string {
  const ext = getFileExtension(fileName);
  if (ext === 'jpg') return 'image/jpeg';
  if (ext === 'tif') return 'image/tiff';
  return `image/${ext || 'jpeg'}`;
}

async function extractImageFiles(files: File[]) {
  const images: File[] = [];
  let zipCount = 0;
  let skippedCount = 0;

  for (const file of files) {
    if (isZipFile(file)) {
      zipCount++;
      const zip = await JSZip.loadAsync(file);
      const entries = Object.values(zip.files);

      for (const entry of entries) {
        if (entry.dir) continue;
        if (!isImageFile(entry.name)) {
          skippedCount++;
          continue;
        }

        const blob = await entry.async('blob');
        const fileName = entry.name.split('/').pop() || entry.name;
        images.push(new File([blob], fileName, { type: imageMimeType(fileName) }));
      }
      continue;
    }

    if (isImageFile(file.name)) {
      images.push(file);
    } else {
      skippedCount++;
    }
  }

  return { images, zipCount, skippedCount };
}

export function FaceManagementPage() {
  const { appId, modelId } = useParams<{ appId: string; modelId: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();

  const [model, setModel] = useState<Model | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubjectKeys, setSelectedSubjectKeys] = useState<string[]>([]);
  const [subjectPage, setSubjectPage] = useState(1);
  const [subjectPageSize, setSubjectPageSize] = useState(10);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [faces, setFaces] = useState<Face[]>([]);
  const [facesPage, setFacesPage] = useState(1);
  const [facesPageSize, setFacesPageSize] = useState(20);
  const [facesTotal, setFacesTotal] = useState(0);
  const [selectedFaceKeys, setSelectedFaceKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [facesLoading, setFacesLoading] = useState(false);

  const [addSubjectOpen, setAddSubjectOpen] = useState(false);
  const [addingSubject, setAddingSubject] = useState(false);
  const [addSubjectFiles, setAddSubjectFiles] = useState<File[]>([]);
  const [subjectForm] = Form.useForm();

  const [renameOpen, setRenameOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameForm] = Form.useForm();

  const [batchUploading, setBatchUploading] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, phase: '' });
  const [compressUploads, setCompressUploads] = useState(true);
  const [compressTargetKB, setCompressTargetKB] = useState(100);

  useEffect(() => {
    if (!appId) return;
    getModels(appId)
      .then((models) => {
        const m = models.find((x) => x.id === modelId);
        if (m) {
          setModel(m);
          setApiKey(m.apiKey);
        }
      })
      .catch(() => message.error('加载模型信息失败'));
  }, [appId, modelId, message]);

  const fetchSubjects = useCallback(async () => {
    if (!apiKey) return;
    setLoading(true);
    try {
      const list = await getSubjects(apiKey);
      setSubjects(list);
    } catch {
      message.error('加载主体列表失败');
    } finally {
      setLoading(false);
    }
  }, [apiKey, message]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const fetchFaces = useCallback(async (subject: string, page = facesPage, size = facesPageSize) => {
    if (!apiKey) return;
    setFacesLoading(true);
    try {
      const res = await getFaces(apiKey, subject, page - 1, size);
      setFaces(res.faces || []);
      setFacesTotal(res.total_elements || 0);
    } catch {
      message.error('加载人脸列表失败');
    } finally {
      setFacesLoading(false);
    }
  }, [apiKey, facesPage, facesPageSize, message]);

  useEffect(() => {
    if (selectedSubject) {
      fetchFaces(selectedSubject, facesPage, facesPageSize);
    } else {
      setFaces([]);
      setFacesTotal(0);
      setSelectedFaceKeys([]);
    }
  }, [selectedSubject, facesPage, facesPageSize, fetchFaces]);

  const prepareUploadFile = (file: File) => {
    if (!compressUploads) return Promise.resolve(file);
    return compressImage(file, compressTargetKB);
  };

  const handleAddSubject = async () => {
    try {
      const values = await subjectForm.validateFields();
      setAddingSubject(true);
      const subject = values.subject;
      await addSubject(apiKey, subject);

      let uploadSuccess = 0;
      let uploadFail = 0;
      if (addSubjectFiles.length > 0) {
        const extracted = await extractImageFiles(addSubjectFiles);
        for (const file of extracted.images) {
          try {
            const uploadFile = await prepareUploadFile(file);
            await addFace(apiKey, subject, uploadFile);
            uploadSuccess++;
          } catch {
            uploadFail++;
          }
        }
      }

      message.success(addSubjectFiles.length > 0
        ? `主体创建成功，人脸上传成功 ${uploadSuccess} 张，失败 ${uploadFail} 张`
        : '主体创建成功'
      );
      setAddSubjectOpen(false);
      subjectForm.resetFields();
      setAddSubjectFiles([]);
      fetchSubjects();
      setFacesPage(1);
      setSelectedSubject(subject);
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || '创建失败');
    } finally {
      setAddingSubject(false);
    }
  };

  const handleRename = async () => {
    try {
      const values = await renameForm.validateFields();
      setRenaming(true);
      await renameSubject(apiKey, selectedSubject!, values.newName);
      message.success('重命名成功');
      setRenameOpen(false);
      renameForm.resetFields();
      setSelectedSubject(values.newName);
      fetchSubjects();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || '重命名失败');
    } finally {
      setRenaming(false);
    }
  };

  const handleDeleteSubject = async (subject: string) => {
    try {
      await deleteAllFacesOfSubject(subject);
      await deleteSubject(apiKey, subject);
      message.success('删除成功');
      if (selectedSubject === subject) {
        setSelectedSubject(null);
        setSelectedFaceKeys([]);
      }
      fetchSubjects();
    } catch {
      message.error('删除失败');
    }
  };

  const handleBatchDeleteSubjects = async () => {
    if (selectedSubjectKeys.length === 0) {
      message.warning('请先选择要删除的主体');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const subject of selectedSubjectKeys) {
      try {
        await deleteAllFacesOfSubject(subject);
        await deleteSubject(apiKey, subject);
        successCount++;
      } catch {
        failCount++;
      }
    }

    if (selectedSubject && selectedSubjectKeys.includes(selectedSubject)) {
      setSelectedSubject(null);
      setSelectedFaceKeys([]);
    }
    setSelectedSubjectKeys([]);
    await fetchSubjects();

    if (failCount > 0) {
      message.warning(`批量删除完成: 成功 ${successCount} 个, 失败 ${failCount} 个`);
    } else {
      message.success(`批量删除成功: ${successCount} 个主体`);
    }
  };

  const deleteAllFacesOfSubject = async (subject: string) => {
    const pageSize = 100;

    while (true) {
      const res = await getFaces(apiKey, subject, 0, pageSize);
      const imageIds = (res.faces || []).map((face) => face.image_id);
      if (imageIds.length === 0) {
        break;
      }
      await deleteFaces(apiKey, imageIds);
    }
  };

  const handleDeleteFace = async (imageId: string) => {
    try {
      await deleteFace(apiKey, imageId);
      setSelectedFaceKeys((prev) => prev.filter((id) => id !== imageId));
      message.success('删除成功');
      if (selectedSubject) fetchFaces(selectedSubject, facesPage, facesPageSize);
    } catch {
      message.error('删除失败');
    }
  };

  const handleBatchDeleteFaces = async () => {
    if (selectedFaceKeys.length === 0) {
      message.warning('请先选择要删除的人脸');
      return;
    }
    try {
      await deleteFaces(apiKey, selectedFaceKeys);
      setSelectedFaceKeys([]);
      message.success(`批量删除成功，共删除 ${selectedFaceKeys.length} 张人脸`);
      if (selectedSubject) fetchFaces(selectedSubject, facesPage, facesPageSize);
    } catch {
      message.error('批量删除失败');
    }
  };

  const handleDeleteAllFacesOfSelectedSubject = async () => {
    if (!selectedSubject) {
      message.warning('请先选择一个主体');
      return;
    }

    try {
      await deleteAllFacesOfSubject(selectedSubject);
      setSelectedFaceKeys([]);
      message.success('已删除当前主体下全部人脸');
      fetchFaces(selectedSubject, 1, facesPageSize);
      setFacesPage(1);
    } catch {
      message.error('删除全部人脸失败');
    }
  };

  const handleSingleUpload = async (file: File) => {
    if (!selectedSubject) {
      message.warning('请先选择一个主体');
      return false;
    }
    try {
      const uploadFile = await prepareUploadFile(file);
      await addFace(apiKey, selectedSubject, uploadFile);
      message.success('上传成功');
      fetchFaces(selectedSubject, facesPage, facesPageSize);
    } catch (err: any) {
      message.error(err?.response?.data?.message || '上传失败');
    }
    return false;
  };

  const handleBatchUploadToSubject = async (fileList: File[]) => {
    if (!selectedSubject) {
      message.warning('请先选择一个主体');
      return;
    }
    setBatchUploading(true);
    let successCount = 0;
    let failCount = 0;
    let images: File[] = [];

    try {
      setBatchProgress({ current: 0, total: 1, phase: '解析文件中' });
      const extracted = await extractImageFiles(fileList);
      images = extracted.images;
      if (images.length === 0) {
        message.warning('未找到可上传的图片');
        return;
      }
      if (extracted.zipCount > 0) {
        message.info(`已从 ${extracted.zipCount} 个 ZIP 中解析出 ${images.length} 张图片`);
      }
    } catch {
      message.error('ZIP 解压失败，请确认文件未损坏');
      return;
    } finally {
      if (images.length === 0) {
        setBatchUploading(false);
        setBatchProgress({ current: 0, total: 0, phase: '' });
      }
    }

    for (let i = 0; i < images.length; i++) {
      setBatchProgress({ current: i + 1, total: images.length, phase: compressUploads ? '压缩并上传中' : '上传中' });
      try {
        const uploadFile = await prepareUploadFile(images[i]);
        await addFace(apiKey, selectedSubject, uploadFile);
        successCount++;
      } catch {
        failCount++;
      }
    }

    setBatchUploading(false);
    setBatchProgress({ current: 0, total: 0, phase: '' });
    message.success(`批量上传完成: 成功 ${successCount} 张, 失败 ${failCount} 张`);
    fetchFaces(selectedSubject, facesPage, facesPageSize);
  };

  const handleBatchEnrollByFilename = async (fileList: File[]) => {
    setBatchUploading(true);
    let successCount = 0;
    let failCount = 0;
    let createSubjectCount = 0;
    let skippedDuplicateCount = 0;
    let images: File[] = [];

    try {
      setBatchProgress({ current: 0, total: 1, phase: '解析文件中' });
      const extracted = await extractImageFiles(fileList);
      images = extracted.images;
      if (images.length === 0) {
        message.warning('未找到可录入的图片');
        return;
      }
      if (extracted.zipCount > 0) {
        message.info(`已从 ${extracted.zipCount} 个 ZIP 中解析出 ${images.length} 张图片`);
      }
    } catch {
      message.error('ZIP 解压失败，请确认文件未损坏');
      return;
    } finally {
      if (images.length === 0) {
        setBatchUploading(false);
        setBatchProgress({ current: 0, total: 0, phase: '' });
      }
    }

    const subjectSet = new Set(subjects.map((subject) => subject.toLowerCase()));
    const importedSubjectSet = new Set<string>();

    for (let i = 0; i < images.length; i++) {
      const file = images[i];
      const subject = filenameToSubject(file.name);
      const subjectKey = subject.toLowerCase();
      setBatchProgress({ current: i + 1, total: images.length, phase: `录入 ${subject}` });

      if (subjectSet.has(subjectKey) || importedSubjectSet.has(subjectKey)) {
        skippedDuplicateCount++;
        continue;
      }

      try {
        await addSubject(apiKey, subject);
        subjectSet.add(subjectKey);
        importedSubjectSet.add(subjectKey);
        createSubjectCount++;

        const uploadFile = await prepareUploadFile(file);
        await addFace(apiKey, subject, uploadFile);
        successCount++;
      } catch {
        failCount++;
      }
    }

    setBatchUploading(false);
    setBatchProgress({ current: 0, total: 0, phase: '' });
    await fetchSubjects();
    message.success(`批量录入完成: 新增主体 ${createSubjectCount} 个, 成功 ${successCount} 张, 跳过重复 ${skippedDuplicateCount} 张, 失败 ${failCount} 张`);
  };

  const subjectColumns = [
    { title: '主体名称（用户唯一码）', dataIndex: 'subject', key: 'subject' },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: { subject: string }) => (
        <Space>
          <Button type="link" onClick={() => { setFacesPage(1); setSelectedSubject(record.subject); }}>
            查看
          </Button>
          <Popconfirm title="确定删除此主体及所有关联人脸？" onConfirm={() => handleDeleteSubject(record.subject)}>
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const faceColumns = [
    {
      title: '缩略图',
      dataIndex: 'image_id',
      key: 'image',
      render: (id: string) => (
        <Image src={getFaceImageUrl(apiKey, id)} width={60} height={60} style={{ objectFit: 'cover', borderRadius: 4 }} />
      ),
    },
    { title: 'Image ID', dataIndex: 'image_id', key: 'image_id', ellipsis: true },
    { title: '主体', dataIndex: 'subject', key: 'subject' },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Face) => (
        <Popconfirm title="确定删除此张人脸？" onConfirm={() => handleDeleteFace(record.image_id)}>
          <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      ),
    },
  ];

  const shouldHandleUploadBatch = (file: any, fileList: any[]) => file.uid === fileList[0]?.uid;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(`/apps/${appId}`)} />
          <Title level={4} style={{ margin: 0 }}>
            人脸维护 {model ? `- ${model.name}` : ''}
          </Title>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchSubjects}>刷新</Button>
      </div>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap size="middle">
          <Text strong>上传处理</Text>
          <Space>
            <Text>压缩图片</Text>
            <Switch checked={compressUploads} onChange={setCompressUploads} />
          </Space>
          <Space>
            <Text>目标大小</Text>
            <InputNumber
              min={20}
              max={5120}
              precision={0}
              value={compressTargetKB}
              disabled={!compressUploads}
              onChange={(value) => setCompressTargetKB(value || 100)}
              addonAfter="KB"
            />
          </Space>
          <Text type="secondary">
            默认压缩到 100KB；关闭后按原文件上传，已小于目标大小的图片不会被再次压缩。
          </Text>
        </Space>
      </Card>

      <Card title="主体列表" style={{ marginBottom: 16 }} extra={
        <Space>
          <Popconfirm
            title={`确定删除选中的 ${selectedSubjectKeys.length} 个主体及其所有关联人脸？`}
            onConfirm={handleBatchDeleteSubjects}
            disabled={selectedSubjectKeys.length === 0}
          >
            <Button danger disabled={selectedSubjectKeys.length === 0} icon={<DeleteOutlined />}>
              批量删除
            </Button>
          </Popconfirm>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddSubjectOpen(true)}>
            添加主体
          </Button>
        </Space>
      }>
        <Table
          dataSource={subjects.map((s) => ({ subject: s, key: s }))}
          columns={subjectColumns}
          loading={loading}
          rowSelection={{
            selectedRowKeys: selectedSubjectKeys,
            onChange: (keys) => setSelectedSubjectKeys(keys.map(String)),
          }}
          pagination={{
            current: subjectPage,
            pageSize: subjectPageSize,
            total: subjects.length,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            onChange: (page, pageSize) => {
              setSubjectPage(page);
              setSubjectPageSize(pageSize);
            },
          }}
          size="small"
        />
      </Card>

      <Card style={{ marginBottom: 16 }} title="批量录入（照片名作为用户唯一码）">
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="支持直接上传图片或 ZIP；ZIP 会在浏览器端递归解压并筛选图片，自动以文件名（去后缀）作为 subject；如果主体已存在或本次包内文件名重复，会自动跳过。"
        />
        <Dragger
          multiple
          accept="image/*,.zip"
          showUploadList={false}
          disabled={batchUploading}
          beforeUpload={(file, fileList) => {
            if (!shouldHandleUploadBatch(file, fileList)) return false;
            handleBatchEnrollByFilename(fileList.map((f) => f as unknown as File));
            return false;
          }}
        >
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">点击或拖拽图片 / ZIP 到此区域，按文件名自动录入</p>
          <p className="ant-upload-hint">ZIP 支持多级目录；示例：`EMP001.jpg` 会录入到 subject=EMP001；重复主体会跳过，压缩规则以上方配置为准</p>
        </Dragger>
      </Card>

      <Modal
        title={
          <Space>
            <span>主体: <Tag color="blue">{selectedSubject}</Tag></span>
            <Button size="small" onClick={() => { renameForm.setFieldsValue({ newName: selectedSubject }); setRenameOpen(true); }}>
              重命名
            </Button>
          </Space>
        }
        open={!!selectedSubject}
        onCancel={() => setSelectedSubject(null)}
        footer={null}
        width={1100}
        destroyOnClose
      >
        {selectedSubject && (
          <>
            <Space style={{ marginBottom: 12 }}>
              <Upload
                beforeUpload={(file) => { handleSingleUpload(file); return false; }}
                showUploadList={false}
                accept="image/*"
              >
                <Button icon={<UploadOutlined />}>上传人脸</Button>
              </Upload>
              <Popconfirm
                title={`确定删除选中的 ${selectedFaceKeys.length} 张人脸？`}
                onConfirm={handleBatchDeleteFaces}
                disabled={selectedFaceKeys.length === 0}
              >
                <Button danger size="small" disabled={selectedFaceKeys.length === 0}>
                  删除选中人脸
                </Button>
              </Popconfirm>
              <Popconfirm title="确定删除当前主体下全部人脸？" onConfirm={handleDeleteAllFacesOfSelectedSubject}>
                <Button danger size="small">删除当前主体全部人脸</Button>
              </Popconfirm>
              <Text type="secondary">已选 {selectedFaceKeys.length} 张，可跨页保留</Text>
            </Space>
          <Tabs
            defaultActiveKey="faces"
            items={[
              {
                key: 'faces',
                label: `人脸列表 (${faces.length})`,
                children: (
                  <Table
                    dataSource={faces}
                    columns={faceColumns}
                    rowKey="image_id"
                    loading={facesLoading}
                    rowSelection={{
                      selectedRowKeys: selectedFaceKeys,
                      preserveSelectedRowKeys: true,
                      onChange: (keys) => setSelectedFaceKeys(keys.map(String)),
                    }}
                    pagination={{
                      current: facesPage,
                      pageSize: facesPageSize,
                      total: facesTotal,
                      showSizeChanger: true,
                      pageSizeOptions: [10, 20, 50, 100],
                      onChange: (page, pageSize) => {
                        setFacesPage(page);
                        setFacesPageSize(pageSize);
                      },
                    }}
                    size="small"
                  />
                ),
              },
              {
                key: 'batchToSubject',
                label: '批量上传到当前主体',
                children: (
                  <Card size="small">
                    <Dragger
                      multiple
                      accept="image/*,.zip"
                      showUploadList={false}
                      disabled={batchUploading}
                      beforeUpload={(file, fileList) => {
                        if (!shouldHandleUploadBatch(file, fileList)) return false;
                        handleBatchUploadToSubject(fileList.map((f) => f as unknown as File));
                        return false;
                      }}
                    >
                      <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                      <p className="ant-upload-text">拖拽图片 / ZIP 到此区域批量上传到当前主体</p>
                      <p className="ant-upload-hint">ZIP 会递归解压；压缩规则以上方配置为准</p>
                    </Dragger>
                  </Card>
                ),
              },
            ]}
          />
          <Text type="secondary">当前主体用于人工维护；全量导入建议使用上方“照片名作为用户唯一码”批量录入。</Text>
          </>
        )}
      </Modal>

      <Modal
        title="添加主体并上传人脸"
        open={addSubjectOpen}
        onOk={handleAddSubject}
        onCancel={() => { setAddSubjectOpen(false); subjectForm.resetFields(); setAddSubjectFiles([]); }}
        confirmLoading={addingSubject}
      >
        <Form form={subjectForm} layout="vertical">
          <Form.Item
            name="subject"
            label="主体名称（用户唯一码）"
            rules={[{ required: true, message: '请输入主体名称' }]}
            extra="建议使用员工编号、手机号等唯一标识作为主体名称"
          >
            <Input placeholder="例如: EMP001" />
          </Form.Item>
          <Form.Item label="人脸照片" extra="可选；支持图片或 ZIP，上传后会归入上方手动输入的主体。">
            <Upload
              multiple
              accept="image/*,.zip"
              beforeUpload={(file) => {
                setAddSubjectFiles((prev) => [...prev, file as unknown as File]);
                return false;
              }}
              onRemove={(file) => {
                setAddSubjectFiles((prev) => prev.filter((item) => item.name !== file.name || item.size !== file.size));
              }}
            >
              <Button icon={<UploadOutlined />}>选择图片或 ZIP</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="重命名主体"
        open={renameOpen}
        onOk={handleRename}
        onCancel={() => { setRenameOpen(false); renameForm.resetFields(); }}
        confirmLoading={renaming}
      >
        <Form form={renameForm} layout="vertical">
          <Form.Item name="newName" label="新名称" rules={[{ required: true, message: '请输入新名称' }]}>
            <Input placeholder="输入新的主体名称" />
          </Form.Item>
        </Form>
      </Modal>

      {batchUploading && (
        <div
          style={{
            position: 'fixed',
            left: 280,
            right: 32,
            bottom: 24,
            zIndex: 1000,
            padding: '14px 18px',
            background: '#fff',
            border: '1px solid #d9d9d9',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          }}
        >
          <Progress
            percent={batchProgress.total ? Math.round((batchProgress.current / batchProgress.total) * 100) : 0}
            format={() => `${batchProgress.current}/${batchProgress.total} ${batchProgress.phase}`}
          />
        </div>
      )}
    </div>
  );
}
