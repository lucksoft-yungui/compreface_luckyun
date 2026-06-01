import { useEffect, useRef, useState } from 'react';
import { App, Button, Card, Descriptions, Divider, Empty, InputNumber, Segmented, Space, Tag, Typography, Upload } from 'antd';
import { AimOutlined, ArrowLeftOutlined, InboxOutlined, NodeIndexOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { getModels } from '../api/admin';
import { checkFrontFace } from '../api/recognition';
import { FaceOverlay, type PreviewSize } from '../components/FaceOverlay';
import { compressImage } from '../utils/compress';
import type { Model, RecognitionResult } from '../types';

const { Title, Text } = Typography;
const { Dragger } = Upload;

export function FaceDetectionPage() {
  const { appId, modelId } = useParams<{ appId: string; modelId: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();

  const [model, setModel] = useState<Model | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkMode, setCheckMode] = useState<'lenient' | 'strict'>('lenient');
  const [maxYaw, setMaxYaw] = useState<number | null>(null);
  const [maxPitch, setMaxPitch] = useState<number | null>(null);
  const [maxRoll, setMaxRoll] = useState<number | null>(null);
  const [frontFaceResult, setFrontFaceResult] = useState<boolean | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [detectedFaces, setDetectedFaces] = useState<RecognitionResult[]>([]);
  const [showLandmarks, setShowLandmarks] = useState(true);
  const [showPose, setShowPose] = useState(true);
  const [imageSize, setImageSize] = useState<PreviewSize>({ naturalWidth: 0, naturalHeight: 0, width: 0, height: 0 });
  const previewRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!appId) return;
    getModels(appId)
      .then((models) => {
        const currentModel = models.find((item) => item.id === modelId && item.type === 'DETECTION');
        if (!currentModel) {
          message.warning('当前模型不是检测模型，无法进行正脸校验');
          navigate(`/apps/${appId}`);
          return;
        }
        setModel(currentModel);
      })
      .catch(() => message.error('加载模型信息失败'));
  }, [appId, modelId, message, navigate]);

  const updateImageSize = () => {
    const img = previewRef.current;
    if (!img) return;
    setImageSize({
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      width: img.clientWidth,
      height: img.clientHeight,
    });
  };

  const handleFrontFaceCheck = async (file: File) => {
    if (!model?.apiKey) {
      message.warning('检测模型未就绪');
      return false;
    }

    setChecking(true);
    setFrontFaceResult(null);
    setDetectedFaces([]);
    setImageSize({ naturalWidth: 0, naturalHeight: 0, width: 0, height: 0 });

    try {
      const compressed = await compressImage(file, 5000);
      const imageUrl = URL.createObjectURL(compressed);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return imageUrl;
      });

      const frontFaceRes = await checkFrontFace(model.apiKey, compressed, checkMode, 'landmarks', {
          maxYaw: maxYaw ?? undefined,
          maxPitch: maxPitch ?? undefined,
          maxRoll: maxRoll ?? undefined,
        });
      const faces = frontFaceRes.result || [];
      const passed = checkMode === 'strict'
        ? faces.length > 0 && faces.every((face) => face.front_face_check?.passed)
        : faces.some((face) => face.front_face_check?.passed);
      setFrontFaceResult(passed);
      setDetectedFaces(faces);
      message[passed ? 'success' : 'warning'](passed ? '检测结果：正脸' : '检测结果：非正脸');
    } catch (err: any) {
      message.error(err?.response?.data?.message || '正脸检测失败');
    } finally {
      setChecking(false);
    }

    return false;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(`/apps/${appId}`)} />
          <Title level={4} style={{ margin: 0 }}>
            正脸校验 {model ? `- ${model.name}` : ''}
          </Title>
        </div>
      </div>

      <Card
        title={<Space><AimOutlined /><span>正脸校验测试</span></Space>}
        bodyStyle={{ minHeight: 420 }}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Text type="secondary">
            当前页面使用检测模型调用 `/api/v1/detection/front-face`。默认宽松模式下，只要检测结果里存在至少一张未接近侧脸的可见正脸就放行；严格模式要求检测到的全部人脸都满足较严格的正脸阈值。
          </Text>
          <Space align="center" wrap>
            <Text strong>校验级别</Text>
            <Segmented
              value={checkMode}
              onChange={(value) => setCheckMode(value as 'lenient' | 'strict')}
              options={[
                { label: '宽松模式', value: 'lenient' },
                { label: '严格模式', value: 'strict' },
              ]}
            />
          </Space>
          <Space align="center" wrap>
            <Text strong>自定义阈值</Text>
            <InputNumber
              min={0}
              max={180}
              precision={1}
              placeholder="max_yaw"
              value={maxYaw}
              onChange={(value) => setMaxYaw(typeof value === 'number' ? value : null)}
              style={{ width: 120 }}
            />
            <InputNumber
              min={0}
              max={180}
              precision={1}
              placeholder="max_pitch"
              value={maxPitch}
              onChange={(value) => setMaxPitch(typeof value === 'number' ? value : null)}
              style={{ width: 120 }}
            />
            <InputNumber
              min={0}
              max={180}
              precision={1}
              placeholder="max_roll"
              value={maxRoll}
              onChange={(value) => setMaxRoll(typeof value === 'number' ? value : null)}
              style={{ width: 120 }}
            />
          </Space>
          <Text type="secondary">
            不填写时按当前级别使用内置阈值；填写后优先使用你传入的 `max_yaw / max_pitch / max_roll`。
          </Text>
          <Space align="center" wrap>
            <Button icon={<AimOutlined />} onClick={() => setShowLandmarks((value) => !value)}>
              {showLandmarks ? '隐藏特征点' : '显示特征点'}
            </Button>
            <Button icon={<NodeIndexOutlined />} onClick={() => setShowPose((value) => !value)}>
              {showPose ? '隐藏空间姿态' : '显示空间姿态'}
            </Button>
          </Space>
        </Space>

        <Divider style={{ margin: '20px 0 16px' }} />

        <Dragger
          accept="image/*"
          showUploadList={false}
          beforeUpload={(file) => {
            handleFrontFaceCheck(file);
            return false;
          }}
          disabled={checking}
        >
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">{checking ? '检测中...' : '点击或拖拽图片到此区域测试是否正脸'}</p>
          <p className="ant-upload-hint">该测试只调用 Detection 服务，不会触发识别或入库流程</p>
        </Dragger>

        {(previewUrl || frontFaceResult !== null) && (
          <Card
            size="small"
            style={{ marginTop: 16, background: '#fafcff' }}
            title="正脸校验结果"
            extra={frontFaceResult !== null ? (
              <Tag color={frontFaceResult ? 'green' : 'red'}>
                {frontFaceResult ? '正脸' : '非正脸'}
              </Tag>
            ) : null}
          >
            <Space align="start" size={16} wrap style={{ width: '100%' }}>
              {previewUrl ? (
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
                    style={{ maxWidth: 360, width: '100%', height: 'auto', display: 'block' }}
                  />
                  <FaceOverlay
                    faces={detectedFaces}
                    sizeInfo={imageSize}
                    showLandmarks={showLandmarks}
                    showPose={showPose}
                  />
                </div>
              ) : null}
              <Space direction="vertical" size={8} style={{ flex: 1, minWidth: 280 }}>
                <Text strong>接口返回</Text>
                <Text code>{frontFaceResult === null ? '-' : String(frontFaceResult)}</Text>
                <Text type="secondary">
                  {maxYaw !== null || maxPitch !== null || maxRoll !== null
                    ? '当前优先按自定义阈值判定；未填写的项继续沿用当前级别默认值。'
                    : checkMode === 'lenient'
                      ? '当前为宽松模式：只要存在至少一张未接近 90 度侧转的可见正脸就会返回 true。'
                      : '当前为严格模式：检测到的全部人脸都满足严格姿态阈值时才会返回 true。'}
                </Text>
                <Descriptions size="small" bordered column={1}>
                  <Descriptions.Item label="检测到的人脸数">{detectedFaces.length}</Descriptions.Item>
                  <Descriptions.Item label="阈值模式">{checkMode === 'lenient' ? '宽松模式' : '严格模式'}</Descriptions.Item>
                </Descriptions>
                {detectedFaces.length > 0 ? (
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    {detectedFaces.map((face, index) => (
                      <Card key={index} size="small" title={`人脸 ${index + 1}`}>
                        <Descriptions size="small" bordered column={1}>
                          <Descriptions.Item label="passed">
                            {face.front_face_check?.passed ? <Tag color="green">true</Tag> : <Tag color="red">false</Tag>}
                          </Descriptions.Item>
                          <Descriptions.Item label="box">{JSON.stringify(face.box)}</Descriptions.Item>
                          <Descriptions.Item label="yaw">{face.pose?.yaw ?? '-'}</Descriptions.Item>
                          <Descriptions.Item label="pitch">{face.pose?.pitch ?? '-'}</Descriptions.Item>
                          <Descriptions.Item label="roll">{face.pose?.roll ?? '-'}</Descriptions.Item>
                          <Descriptions.Item label="thresholds">
                            {face.front_face_check?.thresholds ? JSON.stringify(face.front_face_check.thresholds) : '-'}
                          </Descriptions.Item>
                          <Descriptions.Item label="reasons">
                            {face.front_face_check?.reasons?.length ? face.front_face_check.reasons.join(', ') : '-'}
                          </Descriptions.Item>
                          <Descriptions.Item label="landmarks">
                            {face.landmarks?.length ? JSON.stringify(face.landmarks) : '-'}
                          </Descriptions.Item>
                        </Descriptions>
                      </Card>
                    ))}
                  </Space>
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未检测到可标注的人脸" />
                )}
              </Space>
            </Space>
          </Card>
        )}
      </Card>
    </div>
  );
}
