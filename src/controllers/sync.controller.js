const { performSync } = require("../services/syncService");

// POST /sync — Q4
const syncDatabase = async (req, res, next) => {
  try {
    const result = await performSync();

    return res.status(200).json({
      success: true,
      message: "Data synced successfully",
      data: {
        totalFetched: result.totalFetched,
        inserted:     result.inserted,
        duplicates:   result.duplicates,
        rejected:     result.rejected,
      },
    });
  } catch (err) {
    console.error("❌ Sync error:", err.message);
    if (err.response) {
      return res.status(err.response.status || 500).json({
        success: false,
        message: `Sync failed: ${err.response.data?.message || err.message}`,
      });
    }
    next(err);
  }
};

module.exports = { syncDatabase };
