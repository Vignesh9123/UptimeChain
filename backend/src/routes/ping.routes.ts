import { Router } from "express";
import { getLatestResultsForUser, getWebsiteResults, getWebsiteSubmissions } from "../controllers/ping.controller"
import { authMiddleware } from "../middlewares";

const router = Router()
router.get("/latest", authMiddleware, getLatestResultsForUser)
router.get("/:websiteId/submissions", authMiddleware, getWebsiteSubmissions)
router.get("/:websiteId", authMiddleware, getWebsiteResults)
export { router as pingRouter }
