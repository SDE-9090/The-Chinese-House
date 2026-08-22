const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const businessId = req.business_id || "global";
    
    let subfolder = "misc";
    if (req.baseUrl.includes("menu")) subfolder = "menu";
    else if (req.baseUrl.includes("gallery")) subfolder = "gallery";
    else if (req.baseUrl.includes("hero")) subfolder = "hero";
    else if (req.baseUrl.includes("business-settings")) subfolder = "logo";

    return {
      folder: `businesses/${businessId}/${subfolder}`,
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      transformation: [
        {
          width: 800,
          height: 800,
          crop: "limit",
          quality: "auto",
          fetch_format: "auto",
        },
      ],
    };
  },
});

const uploadMenuImage = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

module.exports = uploadMenuImage;
