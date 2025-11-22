const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase client with service role for backend operations
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Delete file from Supabase Storage
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

    const { error } = await supabase.storage
      .from("unibro-files")
      .remove([filePath]);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Failed to delete file",
    };
  }
};

/**
 * Delete staff image from Supabase Storage
 */
const deleteStaffImage = async (storagePath) => {
  try {
    if (!storagePath) {
      return { success: false, error: "No storage path provided" };
    }

    const { error } = await supabase.storage
      .from("unibro-files")
      .remove([storagePath]);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Failed to delete staff image",
    };
  }
};

/**
 * Upload staff image to Supabase Storage
 */
const uploadStaffImage = async (fileBuffer, fileName) => {
  try {
    const timestamp = Date.now();
    const fileExt = fileName.split(".").pop();
    const uniqueFileName = `staff-${timestamp}-${Math.random()
      .toString(36)
      .substring(7)}.${fileExt}`;
    const filePath = `staff-profiles/${uniqueFileName}`;

    const { data, error } = await supabase.storage
      .from("unibro-files")
      .upload(filePath, fileBuffer, {
        cacheControl: "3600",
        upsert: false,
        contentType: "image/jpeg",
      });

    if (error) {
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from("unibro-files")
      .getPublicUrl(filePath);

    return {
      success: true,
      imageUrl: urlData.publicUrl,
      storagePath: filePath,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Failed to upload staff image",
    };
  }
};

/**
 * Extract storage path from staff image URL
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
    return null;
  }
};

module.exports = {
  supabase,
  deleteFileFromSupabase,
  deleteStaffImage,
  uploadStaffImage,
  extractStaffImagePath,
};
