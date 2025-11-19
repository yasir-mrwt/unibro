const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase client for backend
const supabaseUrl = process.env.SUPABASE_URL;

// IMPORTANT: Use SERVICE_ROLE key for backend operations
// This key has admin privileges to delete files
// Get this from Supabase Dashboard -> Settings -> API -> service_role key
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Delete file from Supabase Storage (Backend)
 * @param {string} fileUrl - The public URL or storage path
 * @returns {Promise<Object>}
 */
const deleteFileFromSupabase = async (fileUrl) => {
  try {
    if (!fileUrl) {
      return { success: false, error: "No file URL provided" };
    }

    // Extract storage path from URL
    let filePath = fileUrl;

    if (fileUrl.includes("http")) {
      const url = new URL(fileUrl);
      const pathParts = url.pathname.split("/unibro-files/");
      if (pathParts.length > 1) {
        filePath = pathParts[1];
      }
    }

    console.log("Backend: Deleting file from Supabase:", filePath);

    const { error } = await supabase.storage
      .from("unibro-files")
      .remove([filePath]);

    if (error) {
      console.error("Supabase delete error:", error);
      return { success: false, error: error.message };
    }

    console.log("Backend: File deleted successfully");
    return { success: true };
  } catch (error) {
    console.error("Backend delete file error:", error);
    return {
      success: false,
      error: error.message || "Failed to delete file",
    };
  }
};

/**
 * Delete staff image from Supabase Storage
 * @param {string} storagePath - The storage path of staff image to delete
 * @returns {Promise<Object>} - { success, error }
 */
const deleteStaffImage = async (storagePath) => {
  try {
    if (!storagePath) {
      return { success: false, error: "No storage path provided" };
    }

    console.log("Backend: Deleting staff image from Supabase:", storagePath);

    const { error } = await supabase.storage
      .from("unibro-files") // Using the same bucket as other files
      .remove([storagePath]);

    if (error) {
      console.error("Staff image delete error:", error);
      return { success: false, error: error.message };
    }

    console.log("Backend: Staff image deleted successfully");
    return { success: true };
  } catch (error) {
    console.error("Backend delete staff image error:", error);
    return {
      success: false,
      error: error.message || "Failed to delete staff image",
    };
  }
};

/**
 * Upload staff image to Supabase Storage (Backend version)
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {string} fileName - The filename
 * @returns {Promise<Object>} - { success, imageUrl, error }
 */
const uploadStaffImage = async (fileBuffer, fileName) => {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const fileExt = fileName.split(".").pop();
    const uniqueFileName = `staff-${timestamp}-${Math.random()
      .toString(36)
      .substring(7)}.${fileExt}`;
    const filePath = `staff-profiles/${uniqueFileName}`;

    console.log("Backend: Uploading staff image to Supabase:", filePath);

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from("unibro-files")
      .upload(filePath, fileBuffer, {
        cacheControl: "3600",
        upsert: false,
        contentType: "image/jpeg", // Adjust based on file type
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("unibro-files")
      .getPublicUrl(filePath);

    return {
      success: true,
      imageUrl: urlData.publicUrl,
      storagePath: filePath,
    };
  } catch (error) {
    console.error("Backend staff image upload error:", error);
    return {
      success: false,
      error: error.message || "Failed to upload staff image",
    };
  }
};

/**
 * Extract storage path from staff image URL
 * @param {string} imageUrl - The full public URL of staff image
 * @returns {string} - The storage path (e.g., "staff-profiles/filename.jpg")
 */
const extractStaffImagePath = (imageUrl) => {
  try {
    if (!imageUrl) return null;

    const url = new URL(imageUrl);
    const pathParts = url.pathname.split("/staff-profiles/");

    if (pathParts.length > 1) {
      return `staff-profiles/${pathParts[1]}`;
    }

    return null;
  } catch (error) {
    console.error("Error extracting staff image path:", error);
    return null;
  }
};

module.exports = {
  supabase,
  deleteFileFromSupabase,
  deleteStaffImage, // ADD THIS EXPORT
  uploadStaffImage, // ADD THIS EXPORT
  extractStaffImagePath, // ADD THIS EXPORT
};
