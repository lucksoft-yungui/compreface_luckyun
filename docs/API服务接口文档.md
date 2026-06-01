# API 服务接口文档

## 1. 文档说明

- 服务名称：`java/api`
- 基础路径：`/api/v1`
- 文档范围：当前项目 `java/api/src/main/java/com/exadel/frs/core/trainservice/controller` 下实际暴露的接口
- 认证方式：
  - 大多数识别、检测、比对、底库管理接口要求请求头 `x-api-key`
  - 静态图片下载接口使用路径参数中的 `apiKey`
- 数据格式：
  - 图片上传接口同时支持 `multipart/form-data` 和部分 `application/json(base64)`
  - `base64` 请求体中图片字段统一为 `file`

## 2. 通用约定

### 2.1 通用请求头

| 名称 | 是否必填 | 说明 |
|---|---|---|
| `x-api-key` | 视接口而定 | 应用/模型 API Key |
| `Content-Type` | 是 | 常见为 `multipart/form-data` 或 `application/json` |

### 2.2 通用查询参数

| 参数 | 类型 | 是否必填 | 说明 |
|---|---|---|---|
| `limit` | integer | 否 | 最大处理人脸数，默认 `0`，表示不限制 |
| `det_prob_threshold` | double | 否 | 人脸检测置信度阈值，范围建议 `0.0 ~ 1.0` |
| `face_plugins` | string | 否 | 逗号分隔的插件列表，如 `age,gender,landmarks,mask,pose,calculator` |
| `status` | boolean | 否 | 是否返回执行耗时和插件版本，默认 `false` |
| `detect_faces` | boolean | 否 | 是否执行人脸检测，仅部分接口支持，默认 `true` |

### 2.3 通用 Base64 请求体

```json
{
  "file": "base64图片内容"
}
```

### 2.4 常见返回字段说明

| 字段 | 说明 |
|---|---|
| `box` | 人脸框信息，通常包含坐标和检测概率 |
| `embedding` | 人脸特征向量，仅在启用 `calculator` 插件时返回 |
| `landmarks` | 人脸关键点 |
| `age` | 年龄区间 |
| `gender` | 性别 |
| `mask` | 是否佩戴口罩 |
| `pose` | 姿态信息，包含 `pitch / yaw / roll` |
| `execution_time` | 执行耗时，仅 `status=true` 时返回 |
| `plugins_versions` | 插件版本信息，仅 `status=true` 时返回 |

---

## 3. 配置类接口

### 3.1 获取客户端上传限制

- 接口名称：获取服务配置
- 请求方式：`GET`
- 请求路径：`/api/v1/config`

#### 请求参数

无

#### 返回示例

```json
{
  "clientMaxFileSize": 5242880,
  "clientMaxBodySize": 10485760
}
```

#### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `clientMaxFileSize` | long | 单文件最大字节数 |
| `clientMaxBodySize` | long | 请求体最大字节数 |

---

## 4. 一致性/状态接口

### 4.1 获取一致性状态

- 接口名称：获取版本一致性状态
- 请求方式：`GET`
- 请求路径：`/api/v1/consistence/status`

#### 请求参数

无

#### 返回示例

```json
{
  "demoFaceCollectionIsInconsistent": false,
  "dbIsInconsistent": false,
  "saveImagesToDB": true,
  "status": "OK"
}
```

#### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `demoFaceCollectionIsInconsistent` | boolean | Demo 底库是否不一致 |
| `dbIsInconsistent` | boolean | 数据库 embedding 与当前计算器版本是否不一致 |
| `saveImagesToDB` | boolean | 是否将图片保存到数据库 |
| `status` | string | 当前服务状态 |

---

## 5. 人脸检测接口

### 5.1 图片检测人脸

- 接口名称：人脸检测
- 请求方式：`POST`
- 请求路径：`/api/v1/detection/detect`
- 请求类型：`multipart/form-data`
- 认证：需要 `x-api-key`

#### 入参

| 名称 | 位置 | 类型 | 必填 | 说明 |
|---|---|---|---|---|
| `file` | form-data | file | 是 | 待检测图片 |
| `limit` | query | integer | 否 | 最大返回人脸数 |
| `det_prob_threshold` | query | double | 否 | 检测阈值 |
| `face_plugins` | query | string | 否 | 附加插件 |
| `status` | query | boolean | 否 | 是否返回耗时和插件版本 |

#### 返回示例

```json
{
  "result": [
    {
      "box": {
        "x_min": 100,
        "y_min": 80,
        "x_max": 220,
        "y_max": 240,
        "probability": 0.9987
      },
      "landmarks": [[120, 120], [180, 120], [150, 150], [130, 190], [170, 190]],
      "pose": {
        "pitch": 3.1,
        "yaw": -2.4,
        "roll": 1.0
      }
    }
  ]
}
```

#### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `result` | array | 检测结果列表 |
| `result[].box` | object | 人脸框 |
| `result[].landmarks` | array | 关键点，启用相应插件时返回 |
| `result[].pose` | object | 姿态，启用 `pose` 时返回 |
| `result[].embedding` | array | 特征值，启用 `calculator` 时返回 |
| `plugins_versions` | object | `status=true` 时返回 |

### 5.2 Base64 检测人脸

- 接口名称：人脸检测 Base64
- 请求方式：`POST`
- 请求路径：`/api/v1/detection/detect`
- 请求类型：`application/json`
- 认证：需要 `x-api-key`

#### 请求体

```json
{
  "file": "base64图片内容"
}
```

#### 其他参数

与 `5.1` 相同。

#### 返回

与 `5.1` 相同。

### 5.3 正脸判断

- 接口名称：正脸判断
- 请求方式：`POST`
- 请求路径：`/api/v1/detection/front-face`
- 请求类型：`multipart/form-data`
- 认证：需要 `x-api-key`

#### 入参

| 名称 | 位置 | 类型 | 必填 | 说明 |
|---|---|---|---|---|
| `file` | form-data | file | 是 | 待判断图片 |
| `limit` | query | integer | 否 | 最大返回人脸数，默认 `0`，表示不限制 |
| `det_prob_threshold` | query | double | 否 | 检测阈值 |
| `face_plugins` | query | string | 否 | 附加插件；接口内部会自动补充 `pose` 用于正脸判定 |
| `status` | query | boolean | 否 | 是否返回耗时和插件版本 |
| `mode` | query | string | 否 | 校验模式，支持 `lenient` / `strict`，默认 `lenient` |
| `max_yaw` | query | double | 否 | 自定义最大 `yaw` 阈值；传入后优先于当前模式默认值 |
| `max_pitch` | query | double | 否 | 自定义最大 `pitch` 阈值；传入后优先于当前模式默认值 |
| `max_roll` | query | double | 否 | 自定义最大 `roll` 阈值；传入后优先于当前模式默认值 |

#### 返回示例

```json
{
  "result": [
    {
      "box": {
        "x_min": 100,
        "y_min": 80,
        "x_max": 220,
        "y_max": 240,
        "probability": 0.9987
      },
      "landmarks": [[120, 120], [180, 120], [150, 150], [130, 190], [170, 190]],
      "pose": {
        "pitch": 3.1,
        "yaw": -2.4,
        "roll": 1.0
      },
      "front_face_check": {
        "passed": true,
        "mode": "lenient",
        "thresholds": {
          "max_yaw": 89.0,
          "max_pitch": 89.0,
          "max_roll": 89.0
        },
        "actual": {
          "pitch": 3.1,
          "yaw": -2.4,
          "roll": 1.0
        },
        "reasons": []
      }
    }
  ]
}
```

#### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `result` | array | 全量人脸检测结果，结构与 `/detection/detect` 一致，并额外包含 `front_face_check` |
| `result[].box` | object | 人脸框 |
| `result[].landmarks` | array | 关键点，启用相应插件时返回 |
| `result[].pose` | object | 姿态信息；接口内部会自动计算 |
| `result[].front_face_check` | object | 当前人脸的正脸判定明细 |
| `result[].front_face_check.passed` | boolean | 该人脸是否通过正脸校验 |
| `result[].front_face_check.mode` | string | 本次使用的判定模式 |
| `result[].front_face_check.thresholds` | object | 本次实际生效的阈值 |
| `result[].front_face_check.actual` | object | 参与判定的实际姿态值 |
| `result[].front_face_check.reasons` | array | 未通过原因；通过时为空数组 |
| `plugins_versions` | object | `status=true` 时返回 |

#### 判定规则

- 接口保留全部检测到的人脸，不做过滤；业务侧根据 `result[].front_face_check.passed` 自行筛选正脸
- 未获取到姿态的人脸：`passed=false`，`reasons=["missing_pose"]`
- `lenient` / `strict` 影响的是本次判定上下文与阈值选择，不影响返回全量人脸的行为
- 默认宽松模式阈值：`yaw <= 89`、`pitch <= 89`、`roll <= 89`
- 严格模式阈值：`yaw <= 15`、`pitch <= 15`、`roll <= 20`
- 若请求显式传入 `max_yaw / max_pitch / max_roll`，对应项优先使用请求值；未传入的项继续使用当前模式默认值
- `reasons` 当前可能值：
  - `missing_pose`
  - `yaw_exceeded`
  - `pitch_exceeded`
  - `roll_exceeded`
- 推荐场景：
  - 宽松模式：实验室摄像机抓拍、门禁预检等只需确认人脸未接近侧脸的场景
  - 严格模式：采集、审核等要求画面内所有人脸都满足正脸约束的场景

### 5.4 Base64 正脸判断

- 接口名称：正脸判断 Base64
- 请求方式：`POST`
- 请求路径：`/api/v1/detection/front-face`
- 请求类型：`application/json`
- 认证：需要 `x-api-key`

#### 请求体

```json
{
  "file": "base64图片内容"
}
```

#### 其他参数

与 `5.3` 相同。

#### 返回

与 `5.3` 相同。

---

## 6. 人脸识别接口

### 6.1 图片识别

- 接口名称：人脸识别
- 请求方式：`POST`
- 请求路径：`/api/v1/recognition/recognize`
- 请求类型：`multipart/form-data`
- 认证：需要 `x-api-key`

#### 入参

| 名称 | 位置 | 类型 | 必填 | 说明 |
|---|---|---|---|---|
| `file` | form-data | file | 是 | 待识别图片 |
| `limit` | query | integer | 否 | 最大检测人脸数 |
| `prediction_count` | query | integer | 否 | 每张人脸返回的候选数量，默认 `1` |
| `det_prob_threshold` | query | double | 否 | 检测阈值 |
| `face_plugins` | query | string | 否 | 附加插件 |
| `status` | query | boolean | 否 | 是否返回耗时和插件版本 |
| `detect_faces` | query | boolean | 否 | 是否先做人脸检测 |

#### 返回示例

```json
{
  "result": [
    {
      "box": {
        "probability": 0.9987
      },
      "subjects": [
        {
          "subject": "user_001",
          "similarity": 0.9321
        }
      ]
    }
  ]
}
```

#### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `result` | array | 识别结果 |
| `result[].subjects` | array | 候选主体列表 |
| `result[].subjects[].subject` | string | 主体名称 |
| `result[].subjects[].similarity` | float | 相似度 |
| `result[].embedding` | array | 启用 `calculator` 时返回 |
| `result[].landmarks/age/gender/mask/pose` | mixed | 启用对应插件时返回 |
| `plugins_versions` | object | `status=true` 时返回 |

### 6.2 Base64 识别

- 接口名称：人脸识别 Base64
- 请求方式：`POST`
- 请求路径：`/api/v1/recognition/recognize`
- 请求类型：`application/json`
- 认证：需要 `x-api-key`

#### 请求体

```json
{
  "file": "base64图片内容"
}
```

#### 其他参数

与 `6.1` 相同。

#### 返回

与 `6.1` 相同。

### 6.3 Embedding 识别

- 接口名称：Embedding 识别
- 请求方式：`POST`
- 请求路径：`/api/v1/recognition/embeddings/recognize`
- 请求类型：`application/json`
- 认证：需要 `x-api-key`

#### Query 参数

| 名称 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `prediction_count` | integer | 否 | 每个 embedding 返回的候选数，默认 `1` |

#### 请求体

```json
{
  "embeddings": [
    [0.1, 0.2, 0.3]
  ]
}
```

#### 返回示例

```json
{
  "result": [
    {
      "embedding": [0.1, 0.2, 0.3],
      "similarities": [
        {
          "subject": "user_001",
          "similarity": 0.9321
        }
      ]
    }
  ]
}
```

---

## 7. 人脸比对接口

### 7.1 图片比对

- 接口名称：两图人脸比对
- 请求方式：`POST`
- 请求路径：`/api/v1/verification/verify`
- 请求类型：`multipart/form-data`
- 认证：需要 `x-api-key`

#### 入参

| 名称 | 位置 | 类型 | 必填 | 说明 |
|---|---|---|---|---|
| `source_image` | form-data | file | 是 | 待验证图片 |
| `target_image` | form-data | file | 是 | 对比目标图片 |
| `limit` | query | integer | 否 | 最大处理人脸数 |
| `det_prob_threshold` | query | double | 否 | 检测阈值 |
| `face_plugins` | query | string | 否 | 附加插件 |
| `status` | query | boolean | 否 | 是否返回耗时和插件版本 |

#### 返回示例

```json
{
  "result": [
    {
      "source_image_face": {
        "box": {
          "probability": 0.998
        }
      },
      "face_matches": [
        {
          "similarity": 0.918
        }
      ]
    }
  ]
}
```

#### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `result` | array | 固定为单元素列表 |
| `result[0].source_image_face` | object | 源图人脸信息 |
| `result[0].face_matches` | array | 目标图匹配结果 |
| `result[0].face_matches[].similarity` | float | 相似度 |
| `plugins_versions` | object | `status=true` 时返回 |

### 7.2 Base64 比对

- 接口名称：两图人脸比对 Base64
- 请求方式：`POST`
- 请求路径：`/api/v1/verification/verify`
- 请求类型：`application/json`
- 认证：需要 `x-api-key`

#### 请求体

```json
{
  "source_image": "base64源图",
  "target_image": "base64目标图"
}
```

#### 其他参数

与 `7.1` 相同。

#### 返回

与 `7.1` 相同。

### 7.3 Embedding 比对

- 接口名称：Embedding 比对
- 请求方式：`POST`
- 请求路径：`/api/v1/verification/embeddings/verify`
- 请求类型：`application/json`
- 认证：需要 `x-api-key`

#### 请求体

```json
{
  "source": [0.1, 0.2, 0.3],
  "targets": [
    [0.1, 0.2, 0.29],
    [0.9, 0.8, 0.7]
  ]
}
```

#### 返回示例

```json
{
  "result": [
    {
      "embedding": [0.1, 0.2, 0.29],
      "similarity": 0.98
    },
    {
      "embedding": [0.9, 0.8, 0.7],
      "similarity": 0.31
    }
  ]
}
```

---

## 8. 主体管理接口

### 8.1 新增主体

- 接口名称：创建主体
- 请求方式：`POST`
- 请求路径：`/api/v1/recognition/subjects`
- 请求类型：`application/json`
- 认证：需要 `x-api-key`

#### 请求体

```json
{
  "subject": "user_001"
}
```

#### 字段约束

- `subject` 不能为空
- 长度 `1 ~ 50`
- 不能包含 `;`、`/`、`\`

#### 返回示例

```json
{
  "subject": "user_001"
}
```

### 8.2 查询主体列表

- 接口名称：主体列表
- 请求方式：`GET`
- 请求路径：`/api/v1/recognition/subjects`
- 认证：需要 `x-api-key`

#### 返回示例

```json
{
  "subjects": ["user_001", "user_002"]
}
```

### 8.3 重命名主体

- 接口名称：重命名主体
- 请求方式：`PUT`
- 请求路径：`/api/v1/recognition/subjects/{subject}`
- 请求类型：`application/json`
- 认证：需要 `x-api-key`

#### 路径参数

| 名称 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `subject` | string | 是 | 原主体名称 |

#### 请求体

```json
{
  "subject": "user_001_new"
}
```

#### 返回示例

```json
{
  "updated": true
}
```

### 8.4 删除单个主体

- 接口名称：删除主体
- 请求方式：`DELETE`
- 请求路径：`/api/v1/recognition/subjects/{subject}`
- 认证：需要 `x-api-key`

#### 返回示例

```json
{
  "subject": "user_001"
}
```

### 8.5 删除全部主体

- 接口名称：删除全部主体
- 请求方式：`DELETE`
- 请求路径：`/api/v1/recognition/subjects`
- 认证：需要 `x-api-key`

#### 返回示例

```json
{
  "deleted": 12
}
```

---

## 9. 底库人脸管理接口

### 9.1 新增底库人脸

- 接口名称：新增底库人脸图片
- 请求方式：`POST`
- 请求路径：`/api/v1/recognition/faces`
- 请求类型：`multipart/form-data`
- 认证：需要 `x-api-key`

#### 入参

| 名称 | 位置 | 类型 | 必填 | 说明 |
|---|---|---|---|---|
| `file` | form-data | file | 是 | 仅允许单张图，要求只有一张人脸 |
| `subject` | query/form | string | 是 | 主体名称 |
| `det_prob_threshold` | query | double | 否 | 检测阈值 |

#### 返回示例

```json
{
  "image_id": "6b135f5b-a365-4522-b1f1-4c9ac2dd0728",
  "subject": "user_001"
}
```

### 9.2 Base64 新增底库人脸

- 接口名称：新增底库人脸图片 Base64
- 请求方式：`POST`
- 请求路径：`/api/v1/recognition/faces`
- 请求类型：`application/json`
- 认证：需要 `x-api-key`

#### Query 参数

| 名称 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `subject` | string | 是 | 主体名称 |
| `det_prob_threshold` | double | 否 | 检测阈值 |

#### 请求体

```json
{
  "file": "base64图片内容"
}
```

#### 返回

与 `9.1` 相同。

### 9.3 查询底库人脸列表

- 接口名称：查询底库人脸列表
- 请求方式：`GET`
- 请求路径：`/api/v1/recognition/faces`
- 认证：需要 `x-api-key`

#### Query 参数

| 名称 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `subject` | string | 否 | 按主体筛选 |
| `page` | integer | 否 | 页码，默认 `0` |
| `size` | integer | 否 | 每页数量，默认由 Spring 分页决定 |

#### 返回示例

```json
{
  "faces": [
    {
      "image_id": "6b135f5b-a365-4522-b1f1-4c9ac2dd0728",
      "subject": "user_001"
    }
  ],
  "total_pages": 1,
  "total_elements": 1,
  "page_number": 0,
  "page_size": 20
}
```

### 9.4 下载底库图片

- 接口名称：下载底库图片
- 请求方式：`GET`
- 请求路径：`/api/v1/recognition/faces/{embeddingId}/img`
- 认证：需要 `x-api-key`

#### 路径参数

| 名称 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `embeddingId` | UUID | 是 | 图片对应 embedding ID |

#### 返回

- 二进制图片流 `application/octet-stream`

### 9.5 删除指定主体下全部人脸

- 接口名称：删除主体全部底库人脸
- 请求方式：`DELETE`
- 请求路径：`/api/v1/recognition/faces`
- 认证：需要 `x-api-key`

#### Query 参数

| 名称 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `subject` | string | 是 | 主体名称 |

#### 返回示例

```json
{
  "deleted": 5
}
```

### 9.6 删除单张底库人脸

- 接口名称：删除单张底库人脸
- 请求方式：`DELETE`
- 请求路径：`/api/v1/recognition/faces/{embeddingId}`
- 认证：需要 `x-api-key`

#### 返回示例

```json
{
  "image_id": "6b135f5b-a365-4522-b1f1-4c9ac2dd0728",
  "subject": "user_001"
}
```

### 9.7 批量删除底库人脸

- 接口名称：批量删除底库人脸
- 请求方式：`POST`
- 请求路径：`/api/v1/recognition/faces/delete`
- 请求类型：`application/json`
- 认证：需要 `x-api-key`

#### 请求体

```json
[
  "6b135f5b-a365-4522-b1f1-4c9ac2dd0728",
  "8f912f5b-a365-4522-b1f1-4c9ac2dd0999"
]
```

#### 返回示例

```json
[
  {
    "image_id": "6b135f5b-a365-4522-b1f1-4c9ac2dd0728",
    "subject": "user_001"
  }
]
```

---

## 10. 底库单图验证接口

### 10.1 图片与底库指定人脸比对

- 接口名称：与指定底库人脸比对
- 请求方式：`POST`
- 请求路径：`/api/v1/recognition/faces/{embeddingId}/verify`
- 请求类型：`multipart/form-data`
- 认证：需要 `x-api-key`

#### 入参

| 名称 | 位置 | 类型 | 必填 | 说明 |
|---|---|---|---|---|
| `embeddingId` | path | UUID | 是 | 底库人脸 ID |
| `file` | form-data | file | 是 | 待验证图片 |
| `limit` | query | integer | 否 | 最大处理人脸数 |
| `det_prob_threshold` | query | double | 否 | 检测阈值 |
| `face_plugins` | query | string | 否 | 附加插件 |
| `status` | query | boolean | 否 | 是否返回耗时和插件版本 |

#### 返回示例

```json
{
  "result": [
    {
      "subject": "user_001",
      "similarity": 0.918,
      "box": {
        "probability": 0.998
      }
    }
  ]
}
```

### 10.2 Base64 与底库指定人脸比对

- 接口名称：与指定底库人脸比对 Base64
- 请求方式：`POST`
- 请求路径：`/api/v1/recognition/faces/{embeddingId}/verify`
- 请求类型：`application/json`
- 认证：需要 `x-api-key`

#### 请求体

```json
{
  "file": "base64图片内容"
}
```

#### 其他参数

与 `10.1` 相同。

#### 返回

与 `10.1` 相同。

### 10.3 Embedding 与底库指定人脸比对

- 接口名称：Embedding 与指定底库人脸比对
- 请求方式：`POST`
- 请求路径：`/api/v1/recognition/embeddings/faces/{imageId}/verify`
- 请求类型：`application/json`
- 认证：需要 `x-api-key`

#### 请求体

```json
{
  "embeddings": [
    [0.1, 0.2, 0.3]
  ]
}
```

#### 返回示例

```json
{
  "result": [
    {
      "embedding": [0.1, 0.2, 0.3],
      "similarity": 0.93
    }
  ]
}
```

---

## 11. 静态资源接口

### 11.1 通过路径直链下载图片

- 接口名称：静态图片下载
- 请求方式：`GET`
- 请求路径：`/api/v1/static/{apiKey}/images/{embeddingId}`

#### 路径参数

| 名称 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `apiKey` | string | 是 | 应用 API Key |
| `embeddingId` | UUID | 是 | 图片对应 embedding ID |

#### 返回

- 二进制图片流 `application/octet-stream`

---

## 12. 迁移接口

### 12.1 启动迁移任务

- 接口名称：启动迁移
- 请求方式：`POST`
- 请求路径：`/api/v1/migrate`

#### 请求参数

无

#### 返回示例

```json
"Migration started"
```

#### 说明

- 该接口会触发迁移状态初始化并启动迁移流程
- 更适合内部运维或初始化场景使用

---

## 13. 常见错误响应

项目统一使用 JSON 错误返回，常见格式如下：

```json
{
  "code": 400,
  "message": "No face is found in the given image"
}
```

### 常见错误场景

| 场景 | 说明 |
|---|---|
| 缺少 `x-api-key` | 请求头缺失 |
| 图片为空或格式不支持 | 上传文件为空、类型不在白名单 |
| `limit` 非法 | 小于 0 |
| `prediction_count` 非法 | 小于 1 |
| 未检测到人脸 | 底层检测失败 |
| 多张人脸不符合要求 | 例如新增底库人脸时要求单人脸 |
| `subject` 不合法 | 为空、超长或包含非法字符 |

---

## 14. 备注

- 若需要对接前端或第三方，建议优先使用：
  - 检测：`/detection/detect`
  - 正脸校验：`/detection/front-face`
    - 默认 `mode=lenient`
    - 如需严格校验，显式传 `mode=strict`
  - 识别：`/recognition/recognize`
  - 两图比对：`/verification/verify`
- `face_plugins` 建议按需开启，避免无意义增加响应体和计算耗时。
- 如果后续你需要，我可以继续把这份文档补成：
  - 带目录锚点的正式交付版
  - 带 curl 示例版
  - 按“对外接口 / 内部接口”拆分版
