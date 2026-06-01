import type { CSSProperties } from 'react';
import type { RecognitionResult } from '../types';

export interface PreviewSize {
  naturalWidth: number;
  naturalHeight: number;
  width: number;
  height: number;
}

interface FaceOverlayProps {
  faces: RecognitionResult[];
  sizeInfo: PreviewSize;
  showLandmarks?: boolean;
  showPose?: boolean;
  boxColor?: string;
}

function getPoseAnchor(face: RecognitionResult, left: number, top: number, width: number, height: number, scaleX: number, scaleY: number) {
  const nosePoint = face.landmarks?.[2];
  if (nosePoint && nosePoint.length >= 2) {
    return {
      x: nosePoint[0] * scaleX,
      y: nosePoint[1] * scaleY,
    };
  }

  return {
    x: left + width / 2,
    y: top + height / 2,
  };
}

function renderPose(face: RecognitionResult, anchorX: number, anchorY: number, axisLength: number, canvasStyle: CSSProperties) {
  if (!face.pose) return null;

  const pitch = face.pose.pitch * Math.PI / 180;
  const yaw = -(face.pose.yaw * Math.PI / 180);
  const roll = face.pose.roll * Math.PI / 180;
  const xAxisX = axisLength * (Math.cos(yaw) * Math.cos(roll)) + anchorX;
  const xAxisY = axisLength * (Math.cos(pitch) * Math.sin(roll) + Math.cos(roll) * Math.sin(pitch) * Math.sin(yaw)) + anchorY;
  const yAxisX = axisLength * (-Math.cos(yaw) * Math.sin(roll)) + anchorX;
  const yAxisY = axisLength * (Math.cos(pitch) * Math.cos(roll) - Math.sin(pitch) * Math.sin(yaw) * Math.sin(roll)) + anchorY;
  const zAxisX = axisLength * Math.sin(yaw) + anchorX;
  const zAxisY = axisLength * (-Math.cos(yaw) * Math.sin(pitch)) + anchorY;

  return (
    <svg style={canvasStyle}>
      <line x1={anchorX} y1={anchorY} x2={xAxisX} y2={xAxisY} stroke="#ff4d4f" strokeWidth="3" />
      <line x1={anchorX} y1={anchorY} x2={yAxisX} y2={yAxisY} stroke="#52c41a" strokeWidth="3" />
      <line x1={anchorX} y1={anchorY} x2={zAxisX} y2={zAxisY} stroke="#1677ff" strokeWidth="3" />
      <circle cx={anchorX} cy={anchorY} r="3" fill="#ffffff" stroke="#1677ff" strokeWidth="1.5" />
    </svg>
  );
}

export function FaceOverlay({
  faces,
  sizeInfo,
  showLandmarks = false,
  showPose = false,
  boxColor = '#13c2c2',
}: FaceOverlayProps) {
  if (sizeInfo.width === 0 || sizeInfo.height === 0) return null;

  const scaleX = sizeInfo.naturalWidth ? sizeInfo.width / sizeInfo.naturalWidth : 1;
  const scaleY = sizeInfo.naturalHeight ? sizeInfo.height / sizeInfo.naturalHeight : 1;
  const canvasStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: sizeInfo.width,
    height: sizeInfo.height,
    pointerEvents: 'none',
  };

  return (
    <>
      {faces.map((face, index) => {
        const box = face.box;
        const left = box.x_min * scaleX;
        const top = box.y_min * scaleY;
        const width = (box.x_max - box.x_min) * scaleX;
        const height = (box.y_max - box.y_min) * scaleY;
        const axisLength = Math.max(28, Math.min(width, height) * 0.55);
        const anchor = getPoseAnchor(face, left, top, width, height, scaleX, scaleY);

        return (
          <div key={index}>
            <div
              style={{
                position: 'absolute',
                left,
                top,
                width,
                height,
                border: `2px solid ${boxColor}`,
                borderRadius: 4,
                pointerEvents: 'none',
              }}
            />
            {showLandmarks && face.landmarks?.map((point, pointIndex) => (
              <span
                key={`${index}-${pointIndex}`}
                style={{
                  position: 'absolute',
                  left: point[0] * scaleX - 3,
                  top: point[1] * scaleY - 3,
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#52c41a',
                  border: '1px solid #ffffff',
                  boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.08)',
                  pointerEvents: 'none',
                }}
              />
            ))}
            {showPose && renderPose(face, anchor.x, anchor.y, axisLength, canvasStyle)}
          </div>
        );
      })}
    </>
  );
}
