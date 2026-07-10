process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET ??= "test-access-secret-please-change-me-32chars";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-please-change-32chars";
process.env.DB_DRIVER ??= "mongo";
process.env.MONGO_URI ??= "mongodb://localhost:27017/test";
