// oss-wrapper.js
const OSS = require("ali-oss");

const HEADERS = {
  // 指定Object的存储类型。
  "x-oss-storage-class": "Standard",
  // 指定Object的访问权限。
  "x-oss-object-acl": "private",
  // 通过文件URL访问文件时，指定以附件形式下载文件，下载后的文件名称定义为example.txt。
  "Content-Disposition": 'attachment; filename="example.txt"',
  // 设置Object的标签，可同时设置多个标签。
  "x-oss-tagging": "Tag1=1&Tag2=2",
  // 指定PutObject操作时是否覆盖同名目标Object。此处设置为true，表示禁止覆盖同名Object。
  "x-oss-forbid-overwrite": "true",
};

/**
 * 创建并返回一个 OSS 客户端实例
 */
function createOssClient(
  region,
  accessKeyId,
  accessKeySecret,
  bucket,
  secure = true
) {
  return new OSS({
    region: region,
    accessKeyId: accessKeyId,
    accessKeySecret: accessKeySecret,
    bucket: bucket,
    secure: secure,
  });
}

/**
 * 使用 Buffer 上传文件
 */
async function uploadBuffer(client, fileName, buffer) {
  // const client = createOssClient();
  try {
    const result = await client.put(fileName, buffer, {
      headers: HEADERS,
    });
    return result.url; // 返回文件的 URL
  } catch (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }
}

module.exports = {
  createOssClient,
  uploadBuffer,
};
