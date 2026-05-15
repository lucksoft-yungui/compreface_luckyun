import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Collapse,
  Descriptions,
  Empty,
  Image,
  InputNumber,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
  Upload,
} from 'antd';
import {
  ArrowLeftOutlined,
  AimOutlined,
  InboxOutlined,
  ManOutlined,
  NodeIndexOutlined,
  ScanOutlined,
  WomanOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { getModels } from '../api/admin';
import { getFaceImageUrl, getFaces, recognize } from '../api/recognition';
import { compressImage } from '../utils/compress';
import type { Face, Model, RecognitionResult } from '../types';

const { Title, Text } = Typography;
const { Dragger } = Upload;

interface RecognitionCandidate {
  key: string;
  faceIndex: number;
  subject: string;
  similarity: number;
  gender: string;
  genderProbability: number | null;
}

interface PreviewSize {
  naturalWidth: number;
  naturalHeight: number;
  width: number;
  height: number;
}

export function FaceRecognitionPage() {
  const { appId, modelId } = useParams<{ appId: string; modelId: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();

  const [model, setModel] = useState<Model | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RecognitionResult[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewReady, setPreviewReady] = useState(false);
  const [showLandmarks, setShowLandmarks] = useState(false);
  const [showPose, setShowPose] = useState(false);
  const [similarityThreshold, setSimilarityThreshold] = useState(80);
  const [activeCandidateKey, setActiveCandidateKey] = useState<string>();
  const [matchedFaces, setMatchedFaces] = useState<Record<string, Face[]>>({});
  const [matchedDetections, setMatchedDetections] = useState<Record<string, RecognitionResult[]>>({});
  const [imageSize, setImageSize] = useState<PreviewSize>({ naturalWidth: 0, naturalHeight: 0, width: 0, height: 0 });
  const [matchedImageSizes, setMatchedImageSizes] = useState<Record<string, PreviewSize>>({});
  const previewRef = useRef<HTMLImageElement | null>(null);

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

  const updateImageSize = () => {
    const img = previewRef.current;
    if (!img) return;
    setImageSize({
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      width: img.clientWidth,
      height: img.clientHeight,
    });
    setPreviewReady(true);
  };

  const updateMatchedImageSize = (imageId: string, img: HTMLImageElement | null) => {
    if (!img) return;
    setMatchedImageSizes((prev) => ({
      ...prev,
      [imageId]: {
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        width: img.clientWidth,
        height: img.clientHeight,
      },
    }));
  };

  const detectStoredFace = async (imageId: string) => {
    const imageUrl = getFaceImageUrl(apiKey, imageId);
    const response = await fetch(imageUrl);
    if (!response.ok) return [] as RecognitionResult[];

    const blob = await response.blob();
    const file = new File([blob], `${imageId}.jpg`, { type: blob.type || 'image/jpeg' });
    const detected = await recognize(apiKey, file, 'landmarks,gender,age,pose');
    return detected.result || [];
  };

  const handleRecognize = async (file: File) => {
    setLoading(true);
    setResults([]);
    setMatchedFaces({});
    setMatchedDetections({});
    setMatchedImageSizes({});
    setImageSize({ naturalWidth: 0, naturalHeight: 0, width: 0, height: 0 });
    setPreviewReady(false);
    setShowLandmarks(false);
    setShowPose(false);

    try {
      const compressed = await compressImage(file, 5000);
      const imgUrl = URL.createObjectURL(compressed);
      setPreviewUrl(imgUrl);

      const res = await recognize(apiKey, compressed, 'landmarks,gender,age,pose');
      const detected = res.result || [];

      const subjects = Array.from(new Set(
        detected.flatMap((item) => item.subjects?.map((subject) => subject.subject) || []).filter(Boolean)
      ));
      const faceEntries = await Promise.all(
        subjects.map(async (subject) => {
          try {
            const faces = await getFaces(apiKey, subject, 0, 3);
            return [subject, faces.faces || []] as const;
          } catch {
            return [subject, []] as const;
          }
        })
      );
      const matchedFaceMap = Object.fromEntries(faceEntries);
      setMatchedFaces(matchedFaceMap);

      const primaryFaces = faceEntries
        .map(([, faces]) => faces[0])
        .filter(Boolean) as Face[];
      const detectionEntries = await Promise.all(
        primaryFaces.map(async (face) => {
          try {
            return [face.image_id, await detectStoredFace(face.image_id)] as const;
          } catch {
            return [face.image_id, []] as const;
          }
        })
      );
      setResults(detected);
      setMatchedDetections(Object.fromEntries(detectionEntries));

      if (detected.length > 0) {
        message.success(`检测到 ${detected.length} 张人脸`);
      } else {
        message.warning('未检测到可识别的人脸');
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || '识别失败');
    } finally {
      setLoading(false);
    }

    return false;
  };

  const candidateRows = useMemo<RecognitionCandidate[]>(() => {
    const threshold = similarityThreshold / 100;
    return results
      .flatMap((face, faceIndex) => (
        face.subjects || []
      ).map((subject, subjectIndex) => ({
        key: `${faceIndex}-${subjectIndex}-${subject.subject}`,
        faceIndex,
        subject: subject.subject,
        similarity: subject.similarity,
        gender: face.gender?.value || '-',
        genderProbability: typeof face.gender?.probability === 'number' ? face.gender.probability : null,
      })))
      .filter((candidate) => candidate.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity);
  }, [results, similarityThreshold]);

  useEffect(() => {
    setActiveCandidateKey(candidateRows[0]?.key);
  }, [candidateRows]);

  const renderPose = (face: RecognitionResult, centerX: number, centerY: number, sizeInfo: PreviewSize) => {
    if (!showPose || !face.pose) return null;

    const size = 70;
    const pitch = face.pose.pitch * Math.PI / 180;
    const yaw = -(face.pose.yaw * Math.PI / 180);
    const roll = face.pose.roll * Math.PI / 180;
    const xAxisX = size * (Math.cos(yaw) * Math.cos(roll)) + centerX;
    const xAxisY = size * (Math.cos(pitch) * Math.sin(roll) + Math.cos(roll) * Math.sin(pitch) * Math.sin(yaw)) + centerY;
    const yAxisX = size * (-Math.cos(yaw) * Math.sin(roll)) + centerX;
    const yAxisY = size * (Math.cos(pitch) * Math.cos(roll) - Math.sin(pitch) * Math.sin(yaw) * Math.sin(roll)) + centerY;
    const zAxisX = size * Math.sin(yaw) + centerX;
    const zAxisY = size * (-Math.cos(yaw) * Math.sin(pitch)) + centerY;

    return (
      <svg style={{ position: 'absolute', inset: 0, width: sizeInfo.width, height: sizeInfo.height, pointerEvents: 'none' }}>
        <line x1={centerX} y1={centerY} x2={xAxisX} y2={xAxisY} stroke="#ff4d4f" strokeWidth="4" />
        <line x1={centerX} y1={centerY} x2={yAxisX} y2={yAxisY} stroke="#52c41a" strokeWidth="4" />
        <line x1={centerX} y1={centerY} x2={zAxisX} y2={zAxisY} stroke="#1677ff" strokeWidth="4" />
      </svg>
    );
  };

  const renderFaceOverlay = (faces: RecognitionResult[], sizeInfo: PreviewSize) => {
    if (sizeInfo.width === 0 || sizeInfo.height === 0) return null;

    const scaleX = sizeInfo.naturalWidth ? sizeInfo.width / sizeInfo.naturalWidth : 1;
    const scaleY = sizeInfo.naturalHeight ? sizeInfo.height / sizeInfo.naturalHeight : 1;

    return faces.map((face, index) => {
      const box = face.box;
      const left = box.x_min * scaleX;
      const top = box.y_min * scaleY;
      const width = (box.x_max - box.x_min) * scaleX;
      const height = (box.y_max - box.y_min) * scaleY;
      const centerX = left + width / 2;
      const centerY = top + height / 2;

      return (
        <div key={index}>
          <div
            style={{
              position: 'absolute',
              left,
              top,
              width,
              height,
              border: '2px solid #13c2c2',
              borderRadius: 4,
              pointerEvents: 'none',
            }}
          />
          {showLandmarks && face.landmarks?.map((point, pointIndex) => (
            <span
              key={`${index}-${pointIndex}`}
              style={{
                position: 'absolute',
                left: point[0] * scaleX - 2,
                top: point[1] * scaleY - 2,
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: '#52c41a',
                pointerEvents: 'none',
              }}
            />
          ))}
          {renderPose(face, centerX, centerY, sizeInfo)}
        </div>
      );
    });
  };

  const renderSimilarityTag = (similarity: number | null) => {
    if (similarity === null) return <Tag>-</Tag>;
    const pct = (similarity * 100).toFixed(2);
    const color = similarity > 0.8 ? 'green' : similarity > 0.5 ? 'orange' : 'red';
    return <Tag color={color}>{pct}%</Tag>;
  };

  const renderGenderTag = (row: RecognitionCandidate) => {
    if (row.gender !== 'male' && row.gender !== 'female') return <Tag>-</Tag>;
    const isMale = row.gender === 'male';
    const pct = row.genderProbability ? ` ${(row.genderProbability * 100).toFixed(0)}%` : '';
    return (
      <Tag icon={isMale ? <ManOutlined /> : <WomanOutlined />} color={isMale ? 'blue' : 'pink'}>
        {row.gender}{pct}
      </Tag>
    );
  };

  return (
    <div>
      {loading && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.72)',
            backdropFilter: 'blur(2px)',
          }}
        >
          <Card bordered={false} style={{ boxShadow: '0 12px 40px rgba(15,23,42,0.16)' }}>
            <Space direction="vertical" align="center" size={12}>
              <Spin size="large" />
              <Text strong>正在识别并加载匹配结果...</Text>
              <Text type="secondary">图片预览、识别结果和标注数据会统一渲染</Text>
            </Space>
          </Card>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(`/apps/${appId}`)} />
          <Title level={4} style={{ margin: 0 }}>
            人脸识别 {model ? `- ${model.name}` : ''}
          </Title>
        </div>
      </div>

      <Row gutter={[16, 16]} align="stretch">
        <Col xs={24} lg={12}>
          <Card
            title={<Space><ScanOutlined /><span>上传人脸照片</span></Space>}
            style={{ height: '100%' }}
            bodyStyle={{ minHeight: 640 }}
          >
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
              message="上传照片后自动识别，左侧展示上传图并默认标注人脸框，右侧展示库中匹配图用于人工比对。"
            />
            <Dragger
              accept="image/*"
              showUploadList={false}
              beforeUpload={(file) => {
                handleRecognize(file);
                return false;
              }}
              disabled={loading}
            >
              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
              <p className="ant-upload-text">{loading ? '识别中...' : '点击或拖拽图片到此区域识别'}</p>
              <p className="ant-upload-hint">支持 jpg、png、webp 等图片格式</p>
            </Dragger>

            {previewUrl && (
              <div style={{ marginTop: 16 }}>
                <div style={{ marginBottom: 8 }}>
                  <Text strong>上传图片</Text>
                  <Text type="secondary" style={{ marginLeft: 8 }}>
                    {loading ? '识别中，图片已先加载用于坐标标注' : '默认显示人脸框'}
                  </Text>
                </div>
                <div
                  style={{
                    position: 'relative',
                    display: 'inline-block',
                    maxWidth: '100%',
                    background: '#f5f7fa',
                    borderRadius: 12,
                    overflow: 'hidden',
                    border: '1px solid #e6eaf0',
                  }}
                >
                  <img
                    ref={previewRef}
                    src={previewUrl}
                    onLoad={updateImageSize}
                    style={{ maxWidth: '100%', maxHeight: 560, width: 'auto', height: 'auto', display: 'block' }}
                  />
                  {renderFaceOverlay(results, imageSize)}
                </div>
              </div>
            )}

            {!previewUrl && !loading && <Empty description="请上传一张包含人脸的图片" style={{ marginTop: 24 }} />}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title="识别结果对比"
            style={{ height: '100%' }}
            bodyStyle={{ minHeight: 640 }}
            extra={results.length > 0 && (
              <Space wrap>
                <Space>
                  <Text type="secondary">相似度阈值</Text>
                  <InputNumber
                    min={0}
                    max={100}
                    step={0.1}
                    precision={2}
                    value={similarityThreshold}
                    onChange={(value) => setSimilarityThreshold(Number(value ?? 0))}
                    addonAfter="%"
                    style={{ width: 120 }}
                  />
                </Space>
                <Button icon={<AimOutlined />} onClick={() => { setShowLandmarks((value) => !value); setTimeout(updateImageSize, 0); }}>
                  {showLandmarks ? '隐藏特征点' : '显示特征点'}
                </Button>
                <Button icon={<NodeIndexOutlined />} onClick={() => { setShowPose((value) => !value); setTimeout(updateImageSize, 0); }}>
                  {showPose ? '隐藏空间姿态' : '显示空间姿态'}
                </Button>
              </Space>
            )}
          >
            {results.length > 0 && previewReady ? (
              <Space direction="vertical" size={14} style={{ width: '100%' }}>
                <Alert
                  type={candidateRows.length > 0 ? 'success' : 'warning'}
                  showIcon
                  message={`检测到 ${results.length} 张人脸，当前阈值命中 ${candidateRows.length} 个候选`}
                  description="候选结果默认按相似度从高到低排序，只展示大于等于当前阈值的匹配项，并默认展开最高分。"
                />
                {candidateRows.length > 0 ? (
                  <Collapse
                    accordion
                    activeKey={activeCandidateKey}
                    onChange={(key) => setActiveCandidateKey(Array.isArray(key) ? key[0] : key)}
                    items={candidateRows.map((row, rank) => {
                      const face = results[row.faceIndex];
                      const storedFaces = matchedFaces[row.subject] || [];
                      const primaryFace = storedFaces[0];

                      return {
                        key: row.key,
                        label: (
                          <Space wrap>
                            <Tag color={rank === 0 ? 'gold' : 'cyan'}>#{rank + 1}</Tag>
                            <Tag>上传人脸 {row.faceIndex + 1}</Tag>
                            <Text strong>{row.subject}</Text>
                            {renderSimilarityTag(row.similarity)}
                          </Space>
                        ),
                        children: (
                          <Row gutter={[16, 12]}>
                            <Col xs={24} md={12}>
                              <div
                                style={{
                                  minHeight: 260,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: '#f7f9fc',
                                  border: '1px solid #e8edf3',
                                  borderRadius: 10,
                                  overflow: 'hidden',
                                }}
                              >
                                {primaryFace ? (
                                  <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
                                    <img
                                      src={getFaceImageUrl(apiKey, primaryFace.image_id)}
                                      alt={row.subject}
                                      onLoad={(event) => updateMatchedImageSize(primaryFace.image_id, event.currentTarget)}
                                      style={{ maxWidth: '100%', maxHeight: 340, objectFit: 'contain', display: 'block' }}
                                    />
                                    {renderFaceOverlay(
                                      matchedDetections[primaryFace.image_id] || [],
                                      matchedImageSizes[primaryFace.image_id] || { naturalWidth: 0, naturalHeight: 0, width: 0, height: 0 }
                                    )}
                                  </div>
                                ) : (
                                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="库中无可展示图片" />
                                )}
                              </div>
                              <Text type="secondary" style={{ display: 'block', marginTop: 8, textAlign: 'center' }}>
                                库中匹配图片
                              </Text>
                            </Col>
                            <Col xs={24} md={12}>
                              <Descriptions size="small" bordered column={1}>
                                <Descriptions.Item label="用户唯一码">
                                  <Tag color="blue">{row.subject}</Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label="相似度">{renderSimilarityTag(row.similarity)}</Descriptions.Item>
                                <Descriptions.Item label="性别">{renderGenderTag(row)}</Descriptions.Item>
                                <Descriptions.Item label="上传人脸序号">人脸 {row.faceIndex + 1}</Descriptions.Item>
                                <Descriptions.Item label="人脸框 box">{JSON.stringify(face.box)}</Descriptions.Item>
                                <Descriptions.Item label="空间姿态 pose">{face.pose ? JSON.stringify(face.pose) : '-'}</Descriptions.Item>
                                <Descriptions.Item label="特征点 landmarks">
                                  {face.landmarks?.length ? `${face.landmarks.length} 个点` : '-'}
                                </Descriptions.Item>
                              </Descriptions>

                              {storedFaces.length > 1 && (
                                <Image.PreviewGroup>
                                  <Space size={8} wrap style={{ marginTop: 12 }}>
                                    {storedFaces.slice(1).map((storedFace) => (
                                      <Image
                                        key={storedFace.image_id}
                                        src={getFaceImageUrl(apiKey, storedFace.image_id)}
                                        width={68}
                                        height={68}
                                        style={{ objectFit: 'cover', borderRadius: 8 }}
                                      />
                                    ))}
                                  </Space>
                                </Image.PreviewGroup>
                              )}
                            </Col>
                          </Row>
                        ),
                      };
                    })}
                  />
                ) : (
                  <Empty description={`没有大于等于 ${similarityThreshold}% 的匹配结果`} />
                )}
              </Space>
            ) : results.length > 0 && !previewReady ? (
              <div style={{ textAlign: 'center', padding: '64px 0' }}>
                <Spin />
                <p style={{ marginTop: 12, color: '#999' }}>正在加载上传图片尺寸，准备绘制标注...</p>
              </div>
            ) : (
              <Empty description={loading ? '识别中...' : '暂无结果，请先上传图片'} />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
