const { cloudinary } = require("../config/cloudinary");
const { resilientFetch, resilientOperation } = require("./resilienceService");

const processAndUploadImage = async (file, requestId) => {
  const form = new FormData();
  form.append("file", new Blob([file.buffer], { type: file.mimetype }), file.originalname || "upload");

  const response = await resilientFetch(
    "hugging-face",
    "https://lilyhurko-fitte-ai-service.hf.space/process-image",
    {
      method: "POST",
      headers: { "X-Service-Token": process.env.AI_SERVICE_TOKEN },
      body: form,
    },
    { timeoutMs: 90000, retries: 1 },
  );
  if (!response.ok) throw new Error(`Hugging Face błąd: ${response.status}`);

  const encodedAnalysis = response.headers.get("x-ai-analysis");
  if (!encodedAnalysis) throw new Error("Brak nagłówka analizy AI");
  const analysis = JSON.parse(Buffer.from(encodedAnalysis, "latin1").toString("utf8"));
  const imageBuffer = Buffer.from(await response.arrayBuffer());

  const uploadedImage = await resilientOperation(
    "cloudinary",
    () => new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "fitte_wardrobe",
          public_id: requestId,
          overwrite: true,
          timeout: 30000,
        },
        (error, result) => error
          ? reject(error)
          : resolve({ imageUrl: result.secure_url, publicId: result.public_id }),
      );
      stream.end(imageBuffer);
    }),
    { retries: 1 },
  );

  return { analysis, uploadedImage };
};

const deleteImage = async (publicId) => {
  if (!publicId) return;
  const result = await resilientOperation(
    "cloudinary",
    () => cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
      invalidate: true,
      timeout: 30000,
    }),
    { retries: 1 },
  );
  if (!["ok", "not found"].includes(result.result)) {
    throw new Error("Cloudinary nie usunął obrazu");
  }
};

module.exports = { processAndUploadImage, deleteImage };
